package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	_ "github.com/mattn/go-sqlite3"
)

var db *sql.DB

func initDB(filepath string) error {
	var err error
	db, err = sql.Open("sqlite3", filepath)
	if err != nil {
		return err
	}
	return nil
}

func getDatabaseInfo() ([]map[string]interface{}, error) {
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

		tableData := [][]interface{}{}
		for dataRows.Next() {
			rowValues := make([]interface{}, len(columns))
			rowPointers := make([]interface{}, len(columns))
			for i := range rowValues {
				rowPointers[i] = &rowValues[i]
			}
			if err := dataRows.Scan(rowPointers...); err != nil {
				return nil, fmt.Errorf("failed to scan row data: %v", err)
			}
			tableData = append(tableData, rowValues)
		}

		tables = append(tables, map[string]interface{}{
			"name":    tableName,
			"columns": columns,
			"rows":    tableData,
		})
	}

	return tables, nil
}

func executeQuery(query string) (map[string]interface{}, error) {
	rows, err := db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to execute query: %v", err)
	}
	defer rows.Close()

	columns, err := rows.Columns()
	if err != nil {
		return nil, fmt.Errorf("failed to get columns: %v", err)
	}

	rawRows := make([][]interface{}, 0)
	for rows.Next() {
		rowValues := make([]interface{}, len(columns))
		rowPointers := make([]interface{}, len(columns))
		for i := range rowValues {
			rowPointers[i] = &rowValues[i]
		}
		if err := rows.Scan(rowPointers...); err != nil {
			return nil, fmt.Errorf("failed to scan row: %v", err)
		}
		rawRows = append(rawRows, rowValues)
	}

	result := map[string]interface{}{
		"columns": columns,
		"rows":    rawRows,
	}

	return result, nil
}

func main() {
	err := initDB("./database.sqlite")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	e := echo.New()
	e.Use(middleware.CORS())

	e.GET("/api", func(c echo.Context) error {
		tables, err := getDatabaseInfo()
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
		}
		return c.JSON(http.StatusOK, map[string]interface{}{"tables": tables})
	})

	e.POST("/api", func(c echo.Context) error {
		var requestBody struct {
			Query string `json:"query"`
		}

		if err := c.Bind(&requestBody); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request body"})
		}

		results, err := executeQuery(requestBody.Query)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
		}

		return c.JSON(http.StatusOK, map[string]interface{}{"results": results})
	})

	e.Logger.Fatal(e.Start(":8080"))
}
