#!/bin/bash

function system_sshd_edit_bool {
  # system_sshd_edit_bool (param_name, "Yes"|"No")
  VALUE=`lower $2`
  if [ "$VALUE" == "yes" ] || [ "$VALUE" == "no" ]; then
      sed -i "s/^#*\($1\).*/\1 $VALUE/" /etc/ssh/sshd_config
      echo "sshd_config set $1=$VALUE"
  fi
}

echo "---> Update and install core packages..."
apt-get update
apt-get -y upgrade
apt-get -y install curl git-core haveged fail2ban ntp
echo "---> Core packages updated and installed."

if [ -z $(which docker) ]; then
  echo "---> Installing docker-ce..."

  if [ "$(cat /etc/apt/sources.list | grep docker)" ]; then
  echo "Docker apt repository already added"
  else
  echo "Adding docker apt repository"
  sudo apt-get -y install \
      apt-transport-https \
      ca-certificates \
      curl \
      software-properties-common
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -

  if [ -z "$(sudo apt-key fingerprint 9DC858229FC7DD38854AE2D88D81803C0EBFCD88)" ]; then
      echo "DANGER: added docker gpg key with incorrect fingerprint"
      exit 1
  fi

  sudo add-apt-repository \
      "deb [arch=amd64] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) \
      stable"
  fi

  sudo apt-get update
  sudo apt-get -y install docker-ce

  echo "---> Installed docker-ce."
fi

echo "---> Configuring firewall (UFW)..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw enable
echo "---> Configured firewall."

echo -n "---> Lock down ssh..."
system_sshd_edit_bool "PasswordAuthentication" "no"
system_sshd_edit_bool "UsePAM" "no"
systemctl restart sshd
service ssh restart
echo "---> Locked down ssh."

echo -n "---> Downloading Faast maker bot docker image..."
docker pull faasthub/maker-bot:latest
echo -n "---> Faast maker bot docker image download complete..."

docker run --rm=true -i -t -v $PWD:/usr/local/faast/host faasthub/maker-bot:latest /usr/local/faast/bin/setup.sh

EXISTING_CRONTAB="$(crontab -l 2>/dev/null)"
APPENDED_CRONTAB="30 * * * * \"$PWD/upgrade.sh\" >\"$PWD/upgrade.log\" 2>&1 #faast-maker-bot-auto-upgrade"
if [ -z "$(echo \"$EXISTING_CRONTAB\" | grep faast-maker-bot-auto-upgrade)" ]; then
  echo -e "$EXISTING_CRONTAB\n$APPENDED_CRONTAB" | crontab -
  echo "Auto upgrade crontab added."
fi

./start.sh