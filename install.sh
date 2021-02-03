#!/bin/bash

set -e

function lower {
  echo $1 | tr '[:upper:]' '[:lower:]'
}
function system_sshd_edit_bool {
  # system_sshd_edit_bool (param_name, "Yes"|"No")
  VALUE=`lower $2`
  if [ "$VALUE" == "yes" ] || [ "$VALUE" == "no" ]; then
    sed -i "s/^#*\($1\).*/\1 $VALUE/" /etc/ssh/sshd_config
    echo "sshd_config set $1=$VALUE"
  fi
}

if ! apt-get --version &>/dev/null; then
  echo "apt-get required"
  exit 1
fi

if ! systemctl --version &>/dev/null; then
  echo "systemctl required"
  exit 1
fi

echo "---> Update and install core packages..."
apt-get update
apt-get -y upgrade
apt-get -y install curl git-core haveged fail2ban
echo "---> Core packages updated and installed."

if ! docker --version 2>/dev/null; then
  echo "---> Installing docker-ce..."
  DOCKER_REPO='https://download.docker.com/linux/ubuntu'

  if grep -q "^deb .*$DOCKER_REPO" /etc/apt/sources.list; then
    echo "Docker apt repository already added"
  else
    echo "Adding docker apt repository"
    sudo apt-get -y install \
        apt-transport-https \
        ca-certificates \
        curl \
        software-properties-common
    curl -fsSL "$DOCKER_REPO/gpg" | sudo apt-key add -

    if [ -z "$(sudo apt-key fingerprint 9DC858229FC7DD38854AE2D88D81803C0EBFCD88)" ]; then
        echo "DANGER: added docker gpg key with incorrect fingerprint"
        exit 1
    fi

    sudo add-apt-repository \
        "deb [arch=amd64] $DOCKER_REPO \
        $(lsb_release -cs) \
        stable"
  fi

  sudo apt-get update
  sudo apt-get -y install docker-ce

  echo "---> Installed docker-ce."
fi

echo ""
read -p "> Apply recommended firewall config (ufw deny incoming)? [y/n]: " REPLY
echo ""

if [[ "$REPLY" == y* ]]; then
  echo "---> Configuring firewall..."
  ufw default deny incoming
  ufw default allow outgoing
  ufw allow ssh
  ufw --force enable
  echo "---> Configured firewall."
fi

echo ""
read -p "> Apply recommended sshd config (disable password auth)? [y/n]: " REPLY
echo ""

if [[ "$REPLY" == y* ]]; then
  echo "---> Locking down ssh..."
  system_sshd_edit_bool "PasswordAuthentication" "no"
  system_sshd_edit_bool "UsePAM" "no"
  systemctl restart sshd
  echo "---> Locked down ssh."
fi

echo "---> Pulling Faast maker bot docker image..."
docker pull faasthub/maker-bot:latest
echo "---> Faast maker bot docker image pull complete."

docker run --rm=true -i -t -v $PWD:/usr/local/faast/host faasthub/maker-bot:latest /usr/local/faast/bin/setup.sh

EXISTING_CRONTAB="$(crontab -l 2>/dev/null; exit 0)"
APPENDED_CRONTAB="30 * * * * \"$PWD/upgrade.sh\" >\"$PWD/upgrade.log\" 2>&1 #faast-maker-bot-auto-upgrade"
if [ -z "$(echo \"$EXISTING_CRONTAB\" | grep faast-maker-bot-auto-upgrade)" ]; then
  echo -e "$EXISTING_CRONTAB\n$APPENDED_CRONTAB" | crontab -
  echo "Auto upgrade crontab added."
fi

./start.sh

echo "---> Maker bot started. Tailing logs"

./logs.sh -f
