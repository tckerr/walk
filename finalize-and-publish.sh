set -e
npm version $1
npm run publish

git commit -m "Version ${$1}"
git tag $1
#git push
echo pushing
