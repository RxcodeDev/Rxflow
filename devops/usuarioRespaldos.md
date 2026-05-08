# Setup usuario `backups` en servidor de producción
# Servidor: rxcode.com.mx / 149.56.142.182
# Conectarse primero como ubuntu: ssh ubuntu@rxcode.com.mx

## PASO 1 — Crear usuario normal (sin -r, para que SSH lo acepte)
# IMPORTANTE: NO usar -r. Los usuarios de sistema (UID < 1000) son bloqueados por SSH.
sudo useradd -m -d /home/backups -s /bin/bash backups

## PASO 2 — Darle acceso de lectura a la carpeta de backups
sudo apt-get install -y acl
sudo setfacl -R -m u:backups:rX /opt/rxcloud/backups/rxflow

## PASO 3 — Crear carpeta .ssh con permisos correctos
sudo mkdir -p /home/backups/.ssh
sudo chmod 700 /home/backups/.ssh
sudo chown backups:backups /home/backups/.ssh

## PASO 4 — Agregar la llave pública de tu máquina local al servidor
# En tu máquina LOCAL, obtén tu llave pública:
#   cat ~/.ssh/id_ed25519.pub
#
# La llave de rxmovil@192 es:
#   ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAVDLL5MFuKpblgbP11xjwX7NTi2C7AbgrCFU83Ddu+X Rxcloude
#
# Pégala en el servidor (como ubuntu):
sudo bash -c 'echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAVDLL5MFuKpblgbP11xjwX7NTi2C7AbgrCFU83Ddu+X Rxcloude" >> /home/backups/.ssh/authorized_keys'
sudo chmod 600 /home/backups/.ssh/authorized_keys
sudo chown backups:backups /home/backups/.ssh/authorized_keys

## PASO 5 — Verificar desde tu máquina local
ssh backups@rxcode.com.mx "echo ok"
# Debe responder: ok

ssh backups@rxcode.com.mx "ls /opt/rxcloud/backups/rxflow | tail -3"
# Lista los 3 backups más recientes

## ERRORES COMUNES
# - "Connection reset": usuario creado con -r (UID 999). Recrear sin -r.
# - "Permission denied": llave equivocada en authorized_keys. Verificar con cat ~/.ssh/id_ed25519.pub en local.
# - "Host key conflict": ssh-keygen -R 149.56.142.182
