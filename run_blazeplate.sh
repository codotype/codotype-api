
# Start Prompt
echo BUILDING APP: $1

# Blazeplate generate
yo blazeplate --force --appconfig=./build/$1/blazeplate.json --buildId=$1

# JS Beautify
echo JS-BEAUTIFY WEB_API
glob-run js-beautify --max_preserve_newlines 1 -r -s 2 "build/$1/**/web_api/server/**/*.js"

echo Replace Blazeplate whitespace markers

# This one works the best!
grep -rl 'BLAZEPLATE WHITESPACE' ./build/$1/ | xargs sed -i 's/\/\/ \/\/ \/\/ \/\/ BLAZEPLATE WHITESPACE//g'

echo Done replacing whitespace markers

# # # # #

# Client beautify
# glob-run js-beautify --max_preserve_newlines 1 -r -s 2 'build/app_5acfeea85535afdb753d55f7/classroom_app/web_client/src/**/*.js'

# Vue Beautify
# glob-run vue-beautify -r --max_preserve_newlines=0 -s=2 -a=1 -S=keep 'build/app_5acfeea85535afdb753d55f7/classroom_app/web_client/src/containers/**/*.vue'

# TODO - can we use ESLINT to auto-lint things like trailing commas?
