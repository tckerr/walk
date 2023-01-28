set -e
npm version $1
npm publish
git tag $1
git push --tags
