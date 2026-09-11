const { Client } = require('pg');
require('dotenv').config({ path: __dirname + '/../artifacts/api-server/.env' });

async function run() {
  const connectionString = process.argv[2] || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/leadsrubix_crm';
  console.log('Connecting to database...');
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const checkQuery = `
      SELECT _id, data->>'key' as key, data->>'name' as name, data->>'route' as route 
      FROM sidebar_menus 
      WHERE data->>'key' IN ('integrations.whatsapp', 'configuration.whatsapp') 
         OR data->>'route' IN ('/integrations/whatsapp', '/configuration/whatsapp');
    `;
    const res = await client.query(checkQuery);
    console.log(`Found ${res.rowCount} menu records:`, res.rows);

    const updateQuery = `
      UPDATE sidebar_menus 
      SET data = jsonb_set(data, '{name}', '"Notifications & Automation"') 
      WHERE data->>'key' IN ('integrations.whatsapp', 'configuration.whatsapp') 
         OR data->>'route' IN ('/integrations/whatsapp', '/configuration/whatsapp');
    `;
    const updateRes = await client.query(updateQuery);
    console.log(`Updated ${updateRes.rowCount} records successfully to "Notifications & Automation".`);
  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    await client.end();
  }
}

run();
