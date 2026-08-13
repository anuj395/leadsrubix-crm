# leads-rubix-backend

High‑standard Node.js/Express backend boilerplate.

## Structure

```
src/
  config/        # environment and configuration
  controllers/   # HTTP request handlers
  middlewares/   # custom Express middleware
  models/        # data access layer (ORM, DB calls, mock)
  routes/        # Express routers
  services/      # business logic
  utils/         # helpers such as loggers
  app.js         # Express app
  index.js       # server start script

tests/           # automated tests (Jest + supertest)
```

## Getting started

1. `npm install`
2. create a `.env` file for configuration (see `src/config/index.js`).
   - set `PORT` if you need a specific port (default is `3001` to avoid colliding with
     common frontend servers).
   - set `MONGO_URI` to your local MongoDB instance (default: `mongodb://localhost:27017/leadrubix-crm`).
   - don't forget `JWT_SECRET`.
3. ensure MongoDB is running locally (e.g. `mongod` or via Docker).
4. `npm run dev` to start in development with nodemon (e.g. `PORT=5000 npm run dev` to override).
5. `npm run start` for production
6. `npm test` to run tests (they spin up a temporary database).
## Notes

- Add databases/ORMS as needed (Sequelize, Mongoose, etc.)
- Authentication has been added via JWT with roles (`superAdmin`, `admin`, `leadManager`, `teamLead`, `sales`).
  - POST `/api/auth/signup` accepts `email`, `password`, `role`. Optional: `industryId`.
  - POST `/api/auth/login` accepts `email`, `password`.
  - Protected routes require `Authorization: Bearer <token>` header.
- Use ESLint to enforce coding style: `npm run lint` or `npm run fix`
- Add CI, documentation, and additional modules as project grows
