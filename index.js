var async = require('async');
var fs = require('fs');
var request = require('request');

function main() {
  var bag = {
    dependencies: [],
    licenseMap: {},
    packageFile: null,
  };

  async.series([
    checkInputParams.bind(null, bag),
    loadDependencies.bind(null, bag),
    getDependencyLicenses.bind(null, bag)
  ],
    function (err) {
      if (err) {
        console.log('Error: ', err);
      }
      fs.writeFileSync('./licenses.json', JSON.stringify(bag.licenseMap, null, 2), 'utf8');
      console.log('Done');
    }
  );
}

function checkInputParams(bag, next) {
  console.log('Checking input params');
  if (process.argv.length < 3) {
    return next('You must specify a path to package.json');
  }

  if (!process.argv[2].endsWith('package.json')) {
    return next('You must specify a path to package.json');
  }

  bag.packageFile = process.argv[2];
  return next();
}

function loadDependencies(bag, next) {
  console.log('Loading dependencies');
  var packageContent = fs.readFileSync(bag.packageFile, 'utf8');
  var packageJson = JSON.parse(packageContent);
  bag.packageJson = packageJson;
  bag.dependencies = Object.keys(packageJson.dependencies);
  return next();
}

function getDependencyLicenses(bag, next) {
  console.log('Getting dependency licenses');

  async.each(bag.dependencies,
    function (dep, nextDep) {
      var url = 'https://registry.npmjs.org/' + dep;
      console.log('Getting license for ' + dep);
      var reqOpts = {
        headers: {
          'Content-Type': 'application/json'
        }
      };
      request.get(url, reqOpts,
        function (err, res) {
          if (err) {
            return nextDep(err);
          }
          var resBody = JSON.parse(res.body);
          console.log('Got license for ' + dep, ":", resBody.license);
          bag.licenseMap[dep] = {
            version: bag.packageJson.dependencies[dep],
            license: resBody.license || 'UNKNOWN'
          };
          return nextDep();
        }
      );
    },
    function (err) {
      return next(err);
    }
  );

}

main();
