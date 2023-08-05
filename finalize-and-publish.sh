set -e

echo "Please input a version number"
read v

npm version "v$v"
npm publish
git push --tags
