const axios = require('axios');

async function test() {
  try {
    console.log('Logging in...');
    const loginRes = await axios.post('http://localhost:8080/api/auth/login', {
      email: 'dev@rubixcrm.dev',
      password: 'rubix1234'
    });
    const token = loginRes.data.token;
    console.log('Logged in successfully, token:', token ? 'exists' : 'missing');

    const headers = { Authorization: `Bearer ${token}` };

    console.log('\n--- GET /api/sidebar/user for admin ---');
    const sidebarAdmin = await axios.post('http://localhost:8080/api/sidebar/user', {
      industry_id: 'temp0001',
      role: 'admin'
    }, { headers });
    console.log(JSON.stringify(sidebarAdmin.data, null, 2));

    console.log('\n--- GET /api/sidebar/user for leadManager ---');
    const sidebarLM = await axios.post('http://localhost:8080/api/sidebar/user', {
      industry_id: 'temp0001',
      role: 'leadManager'
    }, { headers });
    console.log(JSON.stringify(sidebarLM.data, null, 2));

    console.log('\n--- POST /api/screens/resolve for tasks ---');
    const resolveTasks = await axios.post('http://localhost:8080/api/screens/resolve', {
      screen_key: 'tasks',
      industry_code: 'temp0001'
    }, { headers });
    console.log(JSON.stringify(resolveTasks.data, null, 2));

  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}

test();
