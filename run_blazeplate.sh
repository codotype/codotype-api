# run_blazeplate.sh

# Start Prompt
echo BUILDING APP: $1

# Blazeplate generate
yo blazeplate --force --appconfig=./build/$1/blazeplate.json --buildId=$1

# JS Beautify
echo JS-BEAUTIFY WEB_API
glob-run js-beautify --max_preserve_newlines 1 -r -s 2 "build/$1/**/web_api/server/**/*.js"
# glob-run js-beautify --max_preserve_newlines 1 -r -s 2 "build/$1/**/*.js"

# Turns whitespace markers into actual whitespace (SERVER)
echo REPLACE WHITESPACE
# rexreplace '// // // // BLAZEPLATE WHITESPACE\n' '\n' build/*/web_api/server/api/**/*.js
# glob-run rexreplace '// // // // BLAZEPLATE WHITESPACE\n' '\n' "build/$1/**/web_api/server/**/*.js"

# glob-run sed -i 's/\/\/ \/\/ \/\/ \/\/ BLAZEPLATE WHITESPACE//g' course.model.js
# glob-run sed -i 's/\/\/ \/\/ \/\/ \/\/ BLAZEPLATE WHITESPACE/\n/g' "build/$1/**/web_api/server/**/*.js"

# This one works the best!
grep -rl 'BLAZEPLATE WHITESPACE' ./build/$1/ | xargs sed -i 's/\/\/ \/\/ \/\/ \/\/ BLAZEPLATE WHITESPACE//g'

# rexreplace '// // // // BLAZEPLATE WHITESPACE' '' build/$1/**/*.js
echo DONEZO
# rexreplace '// // // // BLAZEPLATE WHITESPACE' '' build/$1/**/web_api/server/api/**/*.js

# # # # #

# Client beautify
# glob-run js-beautify --max_preserve_newlines 1 -r -s 2 'build/app_5acfeea85535afdb753d55f7/classroom_app/web_client/src/**/*.js'

# Turns whitespace markers into actual whitespace (SERVER)
# rexreplace '// // // // BLAZEPLATE WHITESPACE\n' '\n' build/app_5acfeea85535afdb753d55f7/classroom_app/web_client/src/**/*.js
# rexreplace '// // // // BLAZEPLATE WHITESPACE' '' build/app_5acfeea85535afdb753d55f7/classroom_app/web_client/src/**/*.js

# # # # #

# Vue Beautify
# glob-run vue-beautify -r --max_preserve_newlines=0 -s=2 -a=1 -S=keep 'build/app_5acfeea85535afdb753d55f7/classroom_app/web_client/src/containers/**/*.vue'

# TODO - can we use ESLINT to auto-lint things like trailing commas?
