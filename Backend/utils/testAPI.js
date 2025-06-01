import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = `http://localhost:${process.env.PORT || 5000}/api`;

// Test credentials
const adminCreds = { email: 'admin@smilecare.com', password: 'admin123' };
const dentistCreds = { email: 'dr.smith@smilecare.com', password: 'dentist123' };
const patientCreds = { email: 'john.doe@email.com', password: 'patient123' };

let adminToken = '';
let dentistToken = '';
let patientToken = '';

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString();
  const symbols = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
  console.log(`${symbols[type]} ${timestamp} - ${message}`);
};

const test = async (name, testFn) => {
  try {
    await testFn();
    results.passed++;
    results.tests.push({ name, status: 'passed' });
    log(`${name} - PASSED`, 'success');
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'failed', error: error.message });
    log(`${name} - FAILED: ${error.message}`, 'error');
  }
};

const makeRequest = async (method, endpoint, data = null, token = null) => {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: {}
  };

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (data) {
    config.data = data;
    config.headers['Content-Type'] = 'application/json';
  }

  const response = await axios(config);
  return response.data;
};

const runTests = async () => {
  log('🧪 Starting SmileCare API Tests', 'info');

  // Health Check
  await test('Health Check', async () => {
    const response = await axios.get(`http://localhost:${process.env.PORT || 5000}/health`);
    if (!response.data.success) throw new Error('Health check failed');
  });

  // Authentication Tests
  await test('Admin Login', async () => {
    const response = await makeRequest('POST', '/auth/login', adminCreds);
    if (!response.success || !response.data.token) throw new Error('Login failed');
    adminToken = response.data.token;
  });

  await test('Dentist Login', async () => {
    const response = await makeRequest('POST', '/auth/login', dentistCreds);
    if (!response.success || !response.data.token) throw new Error('Login failed');
    dentistToken = response.data.token;
  });

  await test('Patient Login', async () => {
    const response = await makeRequest('POST', '/auth/login', patientCreds);
    if (!response.success || !response.data.token) throw new Error('Login failed');
    patientToken = response.data.token;
  });

  await test('Get Admin Profile', async () => {
    const response = await makeRequest('GET', '/auth/profile', null, adminToken);
    if (!response.success || response.data.role !== 'admin') throw new Error('Profile fetch failed');
  });

  // Invalid login test
  await test('Invalid Login (Should Fail)', async () => {
    try {
      await makeRequest('POST', '/auth/login', { email: 'invalid@test.com', password: 'wrong' });
      throw new Error('Should have failed');
    } catch (error) {
      if (error.response && error.response.status === 401) return; // Expected failure
      throw error;
    }
  });

  // Patient Management Tests
  await test('Get All Patients (Admin)', async () => {
    const response = await makeRequest('GET', '/patients', null, adminToken);
    if (!response.success || !Array.isArray(response.data)) throw new Error('Failed to get patients');
  });

  await test('Get Patients (Patient - Should Fail)', async () => {
    try {
      await makeRequest('GET', '/patients', null, patientToken);
      throw new Error('Should have failed');
    } catch (error) {
      if (error.response && error.response.status === 403) return; // Expected failure
      throw error;
    }
  });

  await test('Get Patient Stats (Admin)', async () => {
    const response = await makeRequest('GET', '/patients/stats', null, adminToken);
    if (!response.success || typeof response.data.totalPatients !== 'number') throw new Error('Failed to get stats');
  });

  // Dentist Management Tests
  await test('Get All Dentists', async () => {
    const response = await makeRequest('GET', '/dentists', null, adminToken);
    if (!response.success || !Array.isArray(response.data)) throw new Error('Failed to get dentists');
  });

  await test('Get Dentist Stats (Admin)', async () => {
    const response = await makeRequest('GET', '/dentists/stats', null, adminToken);
    if (!response.success || typeof response.data.totalDentists !== 'number') throw new Error('Failed to get stats');
  });

  // Appointment Management Tests
  await test('Get All Appointments (Admin)', async () => {
    const response = await makeRequest('GET', '/appointments', null, adminToken);
    if (!response.success || !Array.isArray(response.data)) throw new Error('Failed to get appointments');
  });

  await test('Get Patient Appointments', async () => {
    const response = await makeRequest('GET', '/appointments', null, patientToken);
    if (!response.success || !Array.isArray(response.data)) throw new Error('Failed to get patient appointments');
  });

  await test('Get Dentist Appointments', async () => {
    const response = await makeRequest('GET', '/appointments', null, dentistToken);
    if (!response.success || !Array.isArray(response.data)) throw new Error('Failed to get dentist appointments');
  });

  await test('Get Appointment Stats (Admin)', async () => {
    const response = await makeRequest('GET', '/appointments/stats', null, adminToken);
    if (!response.success || typeof response.data.totalAppointments !== 'number') throw new Error('Failed to get stats');
  });

  // Pagination Tests
  await test('Pagination - Patients', async () => {
    const response = await makeRequest('GET', '/patients?page=1&limit=2', null, adminToken);
    if (!response.success || !response.pagination) throw new Error('Pagination failed');
  });

  await test('Pagination - Dentists', async () => {
    const response = await makeRequest('GET', '/dentists?page=1&limit=1', null, adminToken);
    if (!response.success || !response.pagination) throw new Error('Pagination failed');
  });

  // Filter Tests
  await test('Filter - Patients by Gender', async () => {
    const response = await makeRequest('GET', '/patients?gender=male', null, adminToken);
    if (!response.success) throw new Error('Filter failed');
  });

  await test('Filter - Appointments by Status', async () => {
    const response = await makeRequest('GET', '/appointments?status=scheduled', null, adminToken);
    if (!response.success) throw new Error('Filter failed');
  });

  // Date Range Tests
  await test('Date Range - Appointments', async () => {
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const response = await makeRequest('GET', `/appointments/date-range?startDate=${today}&endDate=${nextWeek}`, null, adminToken);
    if (!response.success || !Array.isArray(response.data)) throw new Error('Date range failed');
  });

  // Authorization Tests
  await test('Unauthorized Access (No Token)', async () => {
    try {
      await makeRequest('GET', '/patients');
      throw new Error('Should have failed');
    } catch (error) {
      if (error.response && error.response.status === 401) return; // Expected failure
      throw error;
    }
  });

  await test('Invalid Token', async () => {
    try {
      await makeRequest('GET', '/patients', null, 'invalid-token');
      throw new Error('Should have failed');
    } catch (error) {
      if (error.response && error.response.status === 401) return; // Expected failure
      throw error;
    }
  });

  // Rate Limiting Test (commented out as it takes time)
  // await test('Rate Limiting', async () => {
  //   const promises = [];
  //   for (let i = 0; i < 150; i++) {
  //     promises.push(axios.get(`http://localhost:${process.env.PORT || 5000}/health`));
  //   }
  //   try {
  //     await Promise.all(promises);
  //     throw new Error('Should have been rate limited');
  //   } catch (error) {
  //     if (error.response && error.response.status === 429) return; // Expected failure
  //     throw error;
  //   }
  // });

  // Print Results
  log('📊 Test Results Summary', 'info');
  log(`✅ Passed: ${results.passed}`, 'success');
  log(`❌ Failed: ${results.failed}`, results.failed > 0 ? 'error' : 'info');
  log(`🎯 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`, 'info');

  if (results.failed > 0) {
    log('❌ Failed Tests:', 'error');
    results.tests.filter(t => t.status === 'failed').forEach(test => {
      log(`   - ${test.name}: ${test.error}`, 'error');
    });
  }

  if (results.failed === 0) {
    log('🎉 All tests passed! SmileCare API is working correctly.', 'success');
  } else {
    log(`⚠️  ${results.failed} test(s) failed. Please check the errors above.`, 'warning');
  }
};

// Helper function to wait for server to be ready
const waitForServer = async (maxAttempts = 10) => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await axios.get(`http://localhost:${process.env.PORT || 5000}/health`);
      return true;
    } catch (error) {
      log(`Waiting for server... (${i + 1}/${maxAttempts})`, 'info');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  throw new Error('Server is not responding');
};

// Main execution
const main = async () => {
  try {
    log('⏳ Waiting for server to be ready...', 'info');
    await waitForServer();
    log('🚀 Server is ready! Starting tests...', 'success');
    await runTests();
  } catch (error) {
    log(`💥 Test execution failed: ${error.message}`, 'error');
    process.exit(1);
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default { runTests, waitForServer };
