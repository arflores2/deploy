#!/usr/bin/env node

import { uploadBuildFiles, deployBuildFiles } from "./lib";

const commander = require('commander');

const lib = require('./lib');

const program = new commander.Command('deploy-cli');

program
  .version('0.0.1')

program.command('build')
  .description('Upload static assets to a build path')
  .requiredOption('-b, --bucket <bucket-name>', 'bucket name for assets to be stored')
  .requiredOption('-B, --build-number <build-number>', 'build numer used in the S3 bucket path')
  .requiredOption('-d, --directory <directory>', 'directory with static assets', 'dist')
  .action((options: { bucket: string, buildNumber: number, directory: string }) => {
    const {
      bucket,
      buildNumber,
      directory
    } = options;
    const fileSpecs = lib.getFilesFromDirectory(directory);
    uploadBuildFiles({ bucket, buildNumber, fileSpecs })
      .then(() => console.log('Successfully uploaded all build files'));
  });

program.command('deploy')
  .description('Deploy built assets to a environment path')
  .requiredOption('-b, --bucket <bucket-name>', 'bucket name for assets to be stored')
  .requiredOption('-B, --build-number <build-number>', 'build number used to copy assets')
  .requiredOption('-e, --environment <env>', 'environment path to deploy build')
  .action((options: { bucket: string, buildNumber: number, environment: string }) => {
    const {
      bucket,
      buildNumber,
      environment
    } = options;
    deployBuildFiles({
      bucket,
      buildNumber,
      environment
    })
  })

program.parse(process.argv);