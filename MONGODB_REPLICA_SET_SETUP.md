# MongoDB Replica Set Setup

## Context

The paper submission flow uses MongoDB transactions through Mongoose sessions.
MongoDB transactions require the server to run as a replica set member or through
mongos. A standalone MongoDB server rejects these operations with:

```text
Transaction numbers are only allowed on a replica set member or mongos
```

The VM MongoDB instance was converted from standalone mode to a single-node
replica set for development and production use.

## MongoDB Service

The active MongoDB process on the VM was:

```text
/usr/bin/mongod --config /etc/mongod.conf
```

Listening on:

```text
127.0.0.1:27017
```

## Config Changes

The file changed on the VM was:

```text
/etc/mongod.conf
```

The important final sections are:

```yaml
net:
  port: 27017
  bindIp: 127.0.0.1

security:
  authorization: enabled
  keyFile: /etc/mongo-keyfile

replication:
  replSetName: rs0
```

Because authorization is enabled, MongoDB required a key file when replication
was enabled.

## Key File

The key file was created at:

```text
/etc/mongo-keyfile
```

Expected ownership and permissions:

```text
mongodb:mongodb
400
```

Commands used:

```bash
sudo openssl rand -base64 756 | sudo tee /etc/mongo-keyfile > /dev/null
sudo chown mongodb:mongodb /etc/mongo-keyfile
sudo chmod 400 /etc/mongo-keyfile
```

## Replica Set Initialization

After restarting MongoDB:

```bash
sudo systemctl restart mongod
sudo systemctl status mongod
```

The replica set was initialized from `mongosh`:

```bash
mongosh "mongodb://adminUser:<password>@localhost:27017/admin?authSource=admin"
```

```js
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "localhost:27017" }
  ]
})
```

Verification:

```js
rs.status()
```

The expected state is:

```text
stateStr: 'PRIMARY'
```

## Environment Variables

Every app that connects to this MongoDB instance must include `replicaSet=rs0`
in its MongoDB connection string.

Examples:

```env
MONGO_URL=mongodb://adminUser:<password>@localhost:27017/fargodb?authSource=admin&replicaSet=rs0
MONGODB_URI=mongodb://adminUser:<password>@localhost:27017/fargodb?authSource=admin&replicaSet=rs0
```

Keep each app on its existing database name. For example, if production already
uses `milhouse`, keep `milhouse` and only add `&replicaSet=rs0`.

Active VM env files found:

```text
/var/www/sciledger/.env
/var/www/sciledger-dev/.env
/home/sciledger/sciledger/.env
/home/sciledger/sciledger/testapp2/.env
```

The local Windows development env file is:

```text
C:\Users\AULA ZERO\Documents\scideep\sciledger-online\.env
```

## Important Notes

- Do not add `replicaSet=rs0` inside `mongosh`; it belongs in `.env` connection strings.
- Do not change database names while applying this fix. Only add `replicaSet=rs0`.
- Restart each Node/Svelte app after changing its `.env`.
- Restart the local dev server after changing the Windows `.env`.
