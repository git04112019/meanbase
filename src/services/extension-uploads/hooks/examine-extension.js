const fs = require('fs');
const Finder = require('fs-finder');
const path = require('path');
const _ = require('lodash');
import feathersErrors from 'feathers-errors'
import fse from 'fs-extra'

const extractFileNameRegex = /^[0-9A-Za-z(\/|\\)*_.\\\-]*$/;

/**
 * Requires hook.params.extensionUrl to be set. If theme has all necessary content, it sets hook.data to the theme data
 */
export default function(options) {
  return hook => {

    return new Promise((resolve, reject) => {

      if(!hook.params.extensionUrl) { return reject('extensionUrl not found.'); }

      const deletePath = path.join(hook.app.get('extensionsPath'), hook.params.extensionUrl);

      const extensionFolderPath = path.join(hook.app.get('extensionsPath'), hook.params.extensionUrl);

      try {
        try {
          var folderContent = fs.statSync(extensionFolderPath);
        } catch(err) {
          if(deletePath) {
            fse.remove(deletePath);
          }
          console.log("Error reading extension content", err);
          return reject(new feathersErrors.Unprocessable('Could not find the extension folder'));
        }


        var extensionjson = {};

        console.log("folderContent", folderContent);

        if(folderContent.isDirectory()) {
          try {
            try {
              var extensionFilePaths = Finder.from(extensionFolderPath).findFiles('<extension.min.js|index.html|extension\.json|screenshot>');
              var index, json, files = [], screenshot;

              for (var i = 0; i < extensionFilePaths.length; i++) {
                var currentExtensionFile = extensionFilePaths[i];
                currentExtensionFile = extensionFilePaths[i].replace(hook.app.get('clientPath'), '');

                if(currentExtensionFile.indexOf('index.html') > -1) {
                  index = currentExtensionFile;
                } else if(currentExtensionFile.indexOf('extension.json') > -1) {
                  json = currentExtensionFile;
                } else if(currentExtensionFile.indexOf('screenshot') > -1) {
                  screenshot = currentExtensionFile;
                } else if(currentExtensionFile.indexOf('.jade') > -1 && extractFileNameRegex.test(currentExtensionFile)) {
                  files.push(currentExtensionFile);
                } else if(extractFileNameRegex.test(currentExtensionFile)) {
                  files.push(currentExtensionFile);
                }

              }
            } catch(err) {
              if(deletePath) {
                fse.remove(deletePath);
              }
              console.log('Error searching files', err);
              return reject(new feathersErrors.NotAcceptable('Extension folder did not contain valid content.'))
            }


            try {
              var extensionjson = JSON.parse(fs.readFileSync(path.join(hook.app.get('clientPath'), json), 'utf8'));
            } catch(e) {
              if(deletePath) {
                fse.remove(deletePath);
              }
              return reject(new feathersErrors.BadRequest("Could not find a valid extension.json file in the extension. If it's there, make sure it doesn't have any errors."));
            }

            try {
              extensionjson.text = fs.readFileSync( path.join(hook.app.get('clientPath'), index), 'utf8');
            } catch(e) {
              if(deletePath) {
                fse.remove(deletePath);
              }
              return reject(new feathersErrors.BadRequest("Could not find an index.html in the extension. An extension needs this file to know what to compile."));
            }

            extensionjson.folderName = hook.params.extensionUrl;

            if(files) {
              extensionjson.urls = files;
            }

            if(screenshot && extractFileNameRegex.test(screenshot)) {
              extensionjson.screenshot = screenshot;
            }
          } catch(err) {
            if(deletePath) {
              fse.remove(deletePath);
            }
            console.log("Error reading extension content", err);
            return reject(new feathersErrors.GeneralError(err));
          }
        } // if is folder
      //
      } catch (err) {
        console.log("validating extension error", err);
        if(deletePath) {
          fse.remove(deletePath);
        }
        return reject(err);
      } finally {
        hook.data = extensionjson;
        return resolve(hook);
      }

    });
  }
};

// if(deletePath) {
//   fse.remove(deletePath);
// }