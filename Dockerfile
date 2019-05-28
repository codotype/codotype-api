FROM node:8.12.0-jessie

# Create a directory where our app will be placed
RUN mkdir /app

# Get all the in this repository
COPY ./ /app

# Change to the app directory
# Installs dependencies for the app
WORKDIR /app
RUN npm install

# Installs generators from GitHub repositories
RUN npm install https://github.com/codotype/codotype-hackathon-starter.git
RUN npm install https://github.com/codotype/codotype-vuejs-simple-generator.git
RUN npm install https://github.com/codotype/codotype-nodejs-express-mongodb-generator.git

# Serve the app
CMD ["node", "www.js"]
