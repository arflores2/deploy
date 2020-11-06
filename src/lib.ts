import * as fs from 'fs';
import * as path from 'path';
import * as AWS from 'aws-sdk';
import * as mimeTypes from 'mime-types';

const s3 = new AWS.S3({ region: 'us-west-2' });

type FileSpec = {
  fileName: string,
  filePath: string
};

export const getFilesFromDirectory = (directory: string): FileSpec[] => {
  const directoryPath = path.resolve(process.cwd(), directory);
  const files = fs.readdirSync(directoryPath);
  return files.map(file => ({
    fileName: file,
    filePath: `${directoryPath}/${file}`
  }))
};

// build files

type BuildConfig = {
  bucket: string,
  buildNumber: number,
  fileSpecs: FileSpec[]
};
export const uploadBuildFiles = (buildConfig: BuildConfig): Promise<AWS.S3.ManagedUpload.SendData[]> => {
  const {
    bucket,
    buildNumber,
    fileSpecs,
  } = buildConfig;

  const uploadPromises = fileSpecs.map(spec => {
    const { fileName, filePath } = spec;
    const content = fs.readFileSync(filePath);
      return uploadFileToS3Bucket({
        bucket,
        bucketPath: `build/${buildNumber}`,
        fileName,
        content
      })
      .then((response) => {
        console.log(`uploaded: ${fileName}`);
        return response;
      }).catch((error) => {
        console.error(`failed to upload: ${fileName}`, error);
        throw error;
      });
  });

  return Promise.all(uploadPromises).catch((errors) => {
    console.log('Failed to upload build files', errors);
    throw 'Failed to upload build files';
  });
};

// env files
// copies index.html from a build path

// push copies
type UploadFileConfig = {
  bucket: string,
  bucketPath: string,
  fileName: string,
  content: Buffer, 
  options?: {
    contentType: string
  }
};
const uploadFileToS3Bucket = (config: UploadFileConfig): Promise<AWS.S3.ManagedUpload.SendData> => {
  const { bucket, bucketPath, fileName, content, options } = config;
  const contentType = (options && options.contentType) || mimeTypes.lookup(fileName) || 'text/html';

  // Setting up S3 upload parameters
  const params = {
      Bucket: bucket,
      Key: `${bucketPath}/${fileName}`, // File name you want to save as in S3
      ContentType: contentType,
      Body: content,
      ACL: 'public-read',
      CacheControl: fileName === 'index.html' || fileName === 'config.js'
        ? 'max-age=60'
        : 'max-age=86400'

  };

  // Uploading files to the bucket
  return s3.upload(params)
    .promise()
    .then((response) => {
        console.log(`File uploaded successfully. ${response.Location}`);
        return response;
    });
};

type DeployBuildFilesConfig = {
  bucket: string,
  buildNumber: number,
  environment: string
}
export const deployBuildFiles = (config: DeployBuildFilesConfig) => {
  const { bucket, buildNumber, environment } = config;
  const filesToCopy = ['index.html', 'config.js'];

  const promises = filesToCopy.map(file => {
    console.log('Copying:', `${bucket}/build/${buildNumber}/${file}`)
    const params = {
      Bucket: bucket,
      CopySource: `${bucket}/build/${buildNumber}/${file}`,
      Key: file === 'index.html'
        ? `envs/${environment}/${file}`
        : `envs/${environment}/config-${buildNumber}.js`,
      ACL: 'public-read',
      MetadataDirective: 'COPY' // copy from source object vs REPLACE
    };
    return s3.copyObject(params)
      .promise()
      .then((response) => {
        console.log(`File deployed: ${file} ${JSON.stringify(params)} ${JSON.stringify(response.CopyObjectResult)}`);
      })
  });

  Promise.all(promises).then(() => {
    console.log('Successfully deployed all files');
  })
}


