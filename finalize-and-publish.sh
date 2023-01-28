set -e
npm version $1
npm run publish
git tag $1
git push --tags
