import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "ArtBid API",
      version: "1.0.0",
      description: "API documentation for the ArtBid auction platform",
    },
    servers: [{ url: "http://localhost:5000", description: "Local server" }],
  },
  apis: ["./routes/*.js"], // Path to API route files for automatic documentation
};

const swaggerSpec = swaggerJsdoc(options);

export default (app) => {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
