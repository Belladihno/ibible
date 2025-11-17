# REA Interactive Bible Backend
# REA Interactive Bible Backend

Welcome to the backend for the REA Interactive Bible App – "A friend that brings you closer to God".

## Contribution Guidelines (DO NOT SKIP)

For detailed contribution instructions, please see [CONTRIBUTION.md](./CONTRIBUTION.md)

## System Diagram

[View the system architecture diagram](https://www.mermaidchart.com/d/65f17bc1-fdf8-4c4a-a69d-cd5b8e3d7c49)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Environment setup

Copy the example environment file and edit your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your own database connection string and secrets.

### 3. Run the project

Development:

```bash
npm run start:dev
```

Production:

```bash
npm run start:prod
```

The application will be running at `http://localhost:3000/api/v1`.
And the following documentation endpoints will be available:
- **Scalar:** `http://localhost:3000/api/v1/reference`
- **Swagger UI:** `http://localhost:3000/api/v1/docs`


### 4. Testing

Unit tests:

```bash
npm run test
```

E2E tests:

```bash
npm run test:e2e
```


Coverage:

```bash
npm run test:cov
```

---



