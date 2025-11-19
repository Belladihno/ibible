# REA Interactive Bible Backend

Welcome to the backend for the REA Interactive Bible App – "A friend that brings you closer to God".

## Contribution Guidelines (DO NOT SKIP)

For detailed contribution instructions, please see [CONTRIBUTION.md](./CONTRIBUTION.md)

## System Diagram

[View the system architecture diagram](https://www.mermaidchart.com/d/65f17bc1-fdf8-4c4a-a69d-cd5b8e3d7c49)

## Getting Started

You can run the project locally for development or use Docker for a containerized setup. In both cases you MUST provide the required environment variables (see notes below).

### Local (development)

1. Install dependencies

```bash
npm install
```

2. Environment setup

Create a local environment file from the example (if present) and edit your values:

```bash
cp .env.example .env
```


Edit the `.env` file with your database connection string, secrets and any other configuration values.

Important: the application requires certain environment variables to run correctly. It is recommended that you set all .env variables. At minimum you should set:

- `PORT` (optional; defaults to `3000`)
- `DATABASE_URL` (or your DB connection variables)
- `JWT_SECRET`
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USERNAME`, `EMAIL_PASSWORD` (if email features are used)

Check `.env.example` for additional environment variables that this project expects.

After setting up your environment variables, run the following command to spin up Redis and Postgres using Docker Compose:

```bash
docker compose up -d
```

This will start the required Redis and Postgres services in the background.

3. Run the project

Development:

```bash
npm run start:dev
```

Production:

```bash
npm run start:prod
```

The application will be available at `http://localhost:3000/api/v1`.
Documentation endpoints:
- **Scalar:** `http://localhost:3000/api/v1/reference`
- **Swagger UI:** `http://localhost:3000/api/v1/docs`


### Testing

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



