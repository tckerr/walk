set -e
npm version $1
npm publish
git push --tags
