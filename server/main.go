package main

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
)

func main() {
	app := fiber.New(fiber.Config{
		AppName: "Repo Analytics v1.0.0",
	})

	// Middleware
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept",
	}))

	// Routes
	app.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"message": "Repo Analytics API",
			"version": "1.0.1",
		})
	})

	app.Post("/api/analyze", analyzeRepo)

	// Start server
	log.Fatal(app.Listen(":8080"))
}

func analyzeRepo(c *fiber.Ctx) error {
	type Request struct {
		RepoURL string `json:"repoUrl"`
	}

	var req Request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if req.RepoURL == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "repoUrl is required",
		})
	}

	// TODO: Implement actual analysis
	return c.JSON(fiber.Map{
		"message": "Analysis started",
		"repoUrl": req.RepoURL,
	})
}
