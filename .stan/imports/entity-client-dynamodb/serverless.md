---
title: Serverless Integration
---

# Serverless Integration

Import the generated table resource into Serverless Framework (YAML).

serverless.yml

```yaml
service: my-service
frameworkVersion: '3'

provider:
  name: aws
  region: us-east-1

resources:
  Resources:
    Table001: ${file(./tables/001/table.yml)}
    Table000: ${file(./tables/000/table.yml)}
```

Notes

- Compose or refresh the generated YAML via:

```bash
mycli dynamodb generate --version 001
```

- Validate drift against the EntityManager:

```bash
mycli dynamodb validate --version 001
```

Related

- [Table lifecycle](./table-lifecycle.md)
