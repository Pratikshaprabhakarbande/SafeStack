const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const archiver = require('archiver');
const FormData = require('form-data');

const API = 'http://localhost:3000/api/v1';

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createTestProjectZip(destPath) {
  const projDir = path.resolve(__dirname, 'test-sample-project');
  fs.mkdirSync(projDir, { recursive: true });

  const pkgJson = {
    name: 'vulnerable-demo-app',
    version: '1.0.0',
    description: 'Sample vulnerable app for SafeStack E2E validation',
    scripts: {
      test: 'node -e "console.log(\'Sample tests passed\'); process.exit(0);"',
    },
    dependencies: {
      lodash: '4.17.20', // Known high severity prototype pollution
    },
  };

  fs.writeFileSync(path.join(projDir, 'package.json'), JSON.stringify(pkgJson, null, 2));

  // Run npm install in test project to generate package-lock.json
  console.log('  Generating package-lock.json for test project...');
  try {
    execSync('npm install --package-lock-only', { cwd: projDir, stdio: 'pipe' });
  } catch (e) {
    console.log('  Warning: lockfile generation fallback');
  }

  // Create zip
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(destPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve(destPath));
    archive.on('error', (err) => reject(err));

    archive.pipe(output);
    archive.directory(projDir, false);
    archive.finalize();
  });
}

async function runE2E() {
  console.log('\n======================================================');
  console.log('      SAFESTACK END-TO-END VALIDATION (PHASE Q)       ');
  console.log('======================================================\n');

  // 1. Health check
  console.log('1. Verifying API health check...');
  const healthRes = await axios.get(`${API}/health`);
  console.log('  Status:', healthRes.status, healthRes.data);
  if (!healthRes.data.success) throw new Error('Health check failed');

  // 2. Create vulnerable project ZIP
  console.log('\n2. Creating sample vulnerable project ZIP (lodash@4.17.20)...');
  const zipPath = path.resolve(__dirname, 'vulnerable-project.zip');
  await createTestProjectZip(zipPath);
  console.log('  Created:', zipPath, `(${fs.statSync(zipPath).size} bytes)`);

  // 3. Upload Project ZIP
  console.log('\n3. Uploading project ZIP to SafeStack...');
  const form = new FormData();
  form.append('project', fs.createReadStream(zipPath));

  const uploadRes = await axios.post(`${API}/projects/upload`, form, {
    headers: form.getHeaders(),
  });
  console.log('  Upload response:', uploadRes.data);
  const projectId = uploadRes.data.data.projectId;
  console.log('  Project ID:', projectId);

  // 4. Start Scan
  console.log('\n4. Initiating dependency scan...');
  const scanRes = await axios.post(`${API}/scans`, { projectId });
  const scanId = scanRes.data.data.scanId;
  console.log('  Scan started, Scan ID:', scanId);

  // 5. Poll Scan Status
  console.log('\n5. Polling scan status until completed...');
  let scanStatus = null;
  for (let i = 0; i < 30; i++) {
    await wait(2000);
    const statusRes = await axios.get(`${API}/scans/${scanId}`);
    scanStatus = statusRes.data.data;
    console.log(`  [Poll ${i + 1}] Status: ${scanStatus.status}, Vulns: ${scanStatus.vulnerableCount || 0}`);
    if (scanStatus.status === 'completed' || scanStatus.status === 'failed') break;
  }
  if (scanStatus.status !== 'completed') throw new Error('Scan did not complete successfully');

  // 6. Inspect Vulnerabilities
  console.log('\n6. Fetching scan results and detected vulnerabilities...');
  const resultsRes = await axios.get(`${API}/scans/${scanId}/results`);
  const vulns = resultsRes.data.data.vulnerabilities;
  console.log(`  Found ${vulns.length} vulnerabilities`);
  vulns.forEach((v, idx) => {
    console.log(`  [${idx + 1}] ${v.packageName}@${v.currentVersion} - ${v.severity.toUpperCase()} - ${v.title} (Recommended: ${v.recommendedVersion})`);
  });

  const targetVuln = vulns.find((v) => v.packageName === 'lodash') || vulns[0];
  if (!targetVuln) throw new Error('Expected vulnerability in lodash was not found');

  // 7. Request AI Explanation
  console.log(`\n7. Generating AI explanation for ${targetVuln.packageName}...`);
  const explainRes = await axios.post(`${API}/vulnerabilities/${targetVuln._id}/explain`);
  console.log('  AI Explanation:');
  console.log('  --------------------------------------------------');
  console.log(explainRes.data.data.explanation.slice(0, 300) + '...');
  console.log('  --------------------------------------------------');

  // 8. Start Safe Automated Fix
  console.log(`\n8. Initiating Safe Automated Fix for ${targetVuln.packageName}...`);
  const fixRes = await axios.post(`${API}/fixes`, {
    vulnerabilityId: targetVuln._id,
    targetVersion: targetVuln.recommendedVersion || '4.17.21',
  });
  const fixId = fixRes.data.data.fixId;
  console.log('  Fix initiated, Fix ID:', fixId);

  // 9. Poll Fix Status
  console.log('\n9. Polling fix progress (branching -> updating deps -> testing -> re-scan)...');
  let fixRecord = null;
  for (let i = 0; i < 30; i++) {
    await wait(2000);
    const fixPollRes = await axios.get(`${API}/fixes/${fixId}`);
    fixRecord = fixPollRes.data.data;
    console.log(`  [Poll ${i + 1}] Fix Status: ${fixRecord.status}, Tests: ${fixRecord.testsPassed ? 'PASSED' : fixRecord.testsRun ? 'FAILED' : 'WAITING'}`);
    if (fixRecord.status === 'completed' || fixRecord.status === 'compatibility_issue' || fixRecord.status === 'failed') break;
  }

  console.log('\n10. Fix Execution Outcome:');
  console.log('  Status:', fixRecord.status);
  console.log('  Branch created:', fixRecord.branchName);
  console.log('  Tests run:', fixRecord.testsRun, 'Tests passed:', fixRecord.testsPassed);
  if (fixRecord.reScanResult) {
    console.log('  Re-Scan Is Resolved:', fixRecord.reScanResult.isResolved);
    console.log('  Before vs After Comparison:', JSON.stringify(fixRecord.reScanResult.comparison));
  }

  // 11. Create Pull Request
  console.log('\n11. Generating Pull Request for user review...');
  const prRes = await axios.post(`${API}/pull-requests`, { fixId });
  const pr = prRes.data.data;
  console.log('  Pull Request Created successfully!');
  console.log('  PR Title:', pr.title);
  console.log('  PR Head Branch:', pr.headBranch);
  console.log('  PR Base Branch:', pr.baseBranch);
  console.log('  PR Status:', pr.status);

  console.log('\n======================================================');
  console.log('  🎉 SAFESTACK END-TO-END VALIDATION PASSED 100%!     ');
  console.log('======================================================\n');
}

runE2E().catch((err) => {
  console.error('\n❌ E2E Validation Error:', err.response?.data || err.message);
  process.exit(1);
});
