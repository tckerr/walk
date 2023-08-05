# update docs
# create git tag in format vM.m.p

set -e
npm version $1
npm publish
git push --tags
