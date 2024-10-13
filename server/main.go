package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"time"
	"try-sqlite/database"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	_ "github.com/mattn/go-sqlite3"
)

var masterDatabase *sql.DB

func getDatabaseInfo(db *sql.DB) ([]map[string]interface{}, error) {
	rows, err := db.Query("SELECT name FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence';")
	if err != nil {
		return nil, fmt.Errorf("failed to query tables: %v", err)
	}
	defer rows.Close()

	tables := []map[string]interface{}{}

	for rows.Next() {
		var tableName string
		if err := rows.Scan(&tableName); err != nil {
			return nil, fmt.Errorf("failed to scan table name: %v", err)
		}

		columnsRows, err := db.Query(fmt.Sprintf("PRAGMA table_info(%s)", tableName))
		if err != nil {
			return nil, fmt.Errorf("failed to query table info: %v", err)
		}
		defer columnsRows.Close()

		var columns []string
		for columnsRows.Next() {
			var (
				cid, name, type_, notNull, dfltValue, pk interface{}
			)
			if err := columnsRows.Scan(&cid, &name, &type_, &notNull, &dfltValue, &pk); err != nil {
				return nil, fmt.Errorf("failed to scan column info: %v", err)
			}
			columns = append(columns, name.(string))
		}

		dataRows, err := db.Query(fmt.Sprintf("SELECT * FROM %s", tableName))
		if err != nil {
			return nil, fmt.Errorf("failed to query table data: %v", err)
		}
		defer dataRows.Close()

		tableData := []map[string]interface{}{}
		for dataRows.Next() {
			rowValues := make([]interface{}, len(columns))
			rowPointers := make([]interface{}, len(columns))
			for i := range rowValues {
				rowPointers[i] = &rowValues[i]
			}
			if err := dataRows.Scan(rowPointers...); err != nil {
				return nil, fmt.Errorf("failed to scan row data: %v", err)
			}

			rowMap := make(map[string]interface{})
			for i, col := range columns {
				rowMap[col] = rowValues[i]
			}
			tableData = append(tableData, rowMap)
		}

		tables = append(tables, map[string]interface{}{
			"name":    tableName,
			"columns": columns,
			"rows":    tableData,
		})
	}

	return tables, nil
}

func executeQuery(db *sql.DB, query string) (map[string]interface{}, error) {
	rows, err := db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to execute query: %v", err)
	}
	defer rows.Close()

	columns, err := rows.Columns()
	if err != nil {
		return nil, fmt.Errorf("failed to get columns: %v", err)
	}

	tableData := []map[string]interface{}{}
	rowCount := 0
	for rows.Next() {
		rowValues := make([]interface{}, len(columns))
		rowPointers := make([]interface{}, len(columns))
		for i := range rowValues {
			rowPointers[i] = &rowValues[i]
		}
		if err := rows.Scan(rowPointers...); err != nil {
			return nil, fmt.Errorf("failed to scan row data: %v", err)
		}
		rowMap := make(map[string]interface{})
		for i, col := range columns {
			rowMap[col] = rowValues[i]
		}
		tableData = append(tableData, rowMap)
		rowCount++
	}

	result := map[string]interface{}{
		"name":        "QueryResult",
		"columns":     columns,
		"columnCount": len(columns),
		"rows":        tableData,
		"rowCount":    rowCount,
	}

	return result, nil
}

func main() {
	var err error
	masterDatabase, err = database.GetMasterDatabase()
	if err != nil {
		log.Fatal(err)
	}
	defer masterDatabase.Close()

	e := echo.New()
	e.Use(middleware.CORS())

	e.GET("/api", func(c echo.Context) error {
		databaseId := c.QueryParam("databaseId")
		if databaseId == "" {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "Missing databaseId query parameter"})
		}

		// Return 404 if the user's database does not exist
		databaseExists, err := database.DatabaseExists(masterDatabase, databaseId)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to check if database exists"})
		}
		if !databaseExists {
			return c.JSON(http.StatusNotFound, map[string]string{"error": "Database not found"})
		}

		err = database.UpdateLastQueried(masterDatabase, databaseId)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to update last queried time"})
		}

		db, err := database.GetDBConnection(databaseId)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
		}

		tables, err := getDatabaseInfo(db)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
		}
		return c.JSON(http.StatusOK, map[string]interface{}{"tables": tables})
	})

	e.POST("/api", func(c echo.Context) error {
		var requestBody struct {
			DatabaseId string `json:"databaseId"`
			Query      string `json:"query"`
		}

		if err := c.Bind(&requestBody); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		}

		err := database.UpdateLastQueried(masterDatabase, requestBody.DatabaseId)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to update last queried time"})
		}

		db, err := database.GetDBConnection(requestBody.DatabaseId)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
		}

		startTime := time.Now()
		results, err := executeQuery(db, requestBody.Query)
		executionTime := time.Since(startTime).Milliseconds()
		response := map[string]interface{}{"executionTime": executionTime}
		if err != nil {
			response["error"] = err.Error()
			return c.JSON(http.StatusBadRequest, response)
		}

		response["results"] = results
		return c.JSON(http.StatusOK, response)
	})

	e.POST("/api/new", func(c echo.Context) error {
		err := database.DeleteStaleDatabases(masterDatabase)
		if err != nil {
			fmt.Println("Failed to delete stale databases:", err)
		}

		publicId := database.GenerateRandomPublicId()
		_, err = masterDatabase.Exec("INSERT INTO databases (public_id) VALUES (?)", publicId)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to create new database"})
		}

		return c.JSON(http.StatusOK, map[string]string{"databaseId": publicId})
	})

	e.POST("/api/reset", func(c echo.Context) error {
		fmt.Println("end points reached")
		var requestBody struct {
			DatabaseId string `json:"databaseId"`
		}

		if err := c.Bind(&requestBody); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		}

		err := database.ResetDatabase(requestBody.DatabaseId)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
		}

		return c.JSON(http.StatusOK, map[string]string{"message": "Database reset successfully"})
	})

	e.Logger.Fatal(e.Start(":8080"))
}
