echo "\nInstalling NGINX..."
sudo apt-get update
sudo apt-get install nginx

echo "\nInstalling Docker..."
curl -sSL https://get.docker.com/ | sh

echo "\nAdding vagrant user to docker group..."
sudo usermod -aG docker root

# # # # #

# echo "\nInstalling Docker Compose..."
sudo curl -o /usr/local/bin/docker-compose -L https://github.com/docker/compose/releases/download/1.13.0/docker-compose-`uname -s`-`uname -m`
sudo chmod +x /usr/local/bin/docker-compose

# # # # #

# echo "\nInstalling Node.js..."
# TODO - install Note@11.x
# TODO - install Yarn globally?
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo apt-get install -y build-essential

# # # # #

server {
  listen 80;
  server_name alpha.codotype.io;
  charset utf-8;

  # Max body size of 100mb
  client_max_body_size 100M;

  # Nginx configuration to work with Vue.Router History mode
  # Doc: https://router.vuejs.org/guide/essentials/history-mode.html#example-server-configurations
  location / {
    root /www;
    try_files $uri $uri/ /index.html;
  }
}

# # # # #

touch /etc/nginx/sites-available/codotype

ln -s /etc/nginx/sites-available/codotype /etc/nginx/sites-enabled/codotype

# # # # #

cp /root/blazeplate_web_client/dist/index.html /www/index.html
cp -r /root/blazeplate_web_client/dist/static/ /www/
