const { S3Client, CreateBucketCommand, PutBucketPolicyCommand, PutPublicAccessBlockCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  credentials: {
    accessKeyId: 'AKIA4KHGJPGZTLWMCIEF',
    secretAccessKey: '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',
  },
  region: 'ap-south-1',
});

async function main() {
  const bucketName = 'leadsrubix-crm-uploads';
  console.log('--- Attempting S3 Bucket Automation ---');
  try {
    console.log('1. Creating bucket: ' + bucketName + ' in ap-south-1...');
    await s3.send(new CreateBucketCommand({
      Bucket: bucketName,
      CreateBucketConfiguration: {
        LocationConstraint: 'ap-south-1'
      }
    }));
    console.log('✅ Bucket created successfully!');
  } catch (err) {
    console.log('CreateBucket response:', err.name, err.message);
  }

  try {
    console.log('2. Configuring public access block...');
    await s3.send(new PutPublicAccessBlockCommand({
      Bucket: bucketName,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: false,
        IgnorePublicAcls: false,
        BlockPublicPolicy: false,
        RestrictPublicBuckets: false,
      }
    }));
    console.log('✅ Public access block configured!');
  } catch (err) {
    console.log('PutPublicAccessBlock response:', err.name, err.message);
  }

  try {
    console.log('3. Applying PublicReadGetObject policy...');
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicReadGetObject',
          Effect: 'Allow',
          Principal: '*',
          Action: 's3:GetObject',
          Resource: 'arn:aws:s3:::' + bucketName + '/*'
        }
      ]
    };
    await s3.send(new PutBucketPolicyCommand({
      Bucket: bucketName,
      Policy: JSON.stringify(policy)
    }));
    console.log('✅ Bucket policy applied successfully!');
  } catch (err) {
    console.log('PutBucketPolicy response:', err.name, err.message);
  }

  try {
    console.log('4. Testing test upload to S3...');
    await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: 'test/connection-test.txt',
      Body: 'Leads Rubix CRM S3 Connection Verified ' + new Date().toISOString(),
      ContentType: 'text/plain'
    }));
    console.log('🎉 S3 UPLOAD TEST SUCCEEDED! URL: https://' + bucketName + '.s3.ap-south-1.amazonaws.com/test/connection-test.txt');
  } catch (err) {
    console.log('Test upload response:', err.name, err.message);
  }
}

main();
