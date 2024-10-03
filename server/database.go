package main

import (
	"database/sql"
	"fmt"
	"math/rand"
	"os"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

func getDBConnection(databaseId string) (*sql.DB, error) {
	if err := os.MkdirAll("./databases", os.ModePerm); err != nil {
		return nil, fmt.Errorf("failed to create databases directory: %v", err)
	}

	dbPath := fmt.Sprintf("./databases/user_%s.sqlite", databaseId)
	return sql.Open("sqlite3", dbPath)
}

func getMasterDatabase() (*sql.DB, error) {
	if err := os.MkdirAll("./databases", os.ModePerm); err != nil {
		return nil, fmt.Errorf("failed to create databases directory: %v", err)
	}
	db, err := sql.Open("sqlite3", "./databases/master.sqlite")
	if err != nil {
		return nil, fmt.Errorf("failed to open master database: %v", err)
	}
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS databases (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			public_id VARCHAR(255) NOT NULL UNIQUE,
			last_queried DATETIME NOT NULL DEFAULT (datetime('now', 'localtime'))
		);
		CREATE INDEX IF NOT EXISTS idx_databases_public_id ON databases(public_id);
	`)

	if err != nil {
		return nil, fmt.Errorf("failed to create databases table: %v", err)
	}

	return db, nil
}

func generateRandomPublicId() string {
	length := 5
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
	seededRand := rand.New(rand.NewSource(time.Now().UnixNano()))
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[seededRand.Intn(len(charset))]
	}
	return string(b)
}

func databaseExists(db *sql.DB, publicId string) (bool, error) {
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM databases WHERE public_id = ?", publicId).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func updateLastQueried(db *sql.DB, publicId string) error {
	result, err := db.Exec("UPDATE databases SET last_queried = datetime('now', 'localtime') WHERE public_id = ?", publicId)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("no rows updated for public_id: %s", publicId)
	}

	return nil
}

func deleteStaleDatabases(db *sql.DB) error {
	rows, err := db.Query("SELECT public_id FROM databases WHERE last_queried < datetime('now', '-1 day')")
	if err != nil {
		return err
	}

	for rows.Next() {
		var publicId string
		if err := rows.Scan(&publicId); err != nil {
			return err
		}
		dbPath := fmt.Sprintf("./databases/user_%s.sqlite", publicId)
		if _, err := os.Stat(dbPath); os.IsNotExist(err) {
			continue
		}

		if err := os.Remove(dbPath); err != nil {
			return err
		}
	}

	_, err = db.Exec("DELETE FROM databases WHERE last_queried < datetime('now', '-1 day')")
	if err != nil {
		return err
	}

	err = deleteUntrackedDatabaseFiles(db)
	if err != nil {
		return err
	}

	return nil
}

func deleteUntrackedDatabaseFiles(db *sql.DB) error {
	files, err := os.ReadDir("./databases")
	if err != nil {
		return err
	}

	// Get all public ids from the databases table
	dbPublicIds := make(map[string]struct{})
	rows, err := db.Query("SELECT public_id FROM databases")
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var publicId string
		if err := rows.Scan(&publicId); err != nil {
			return err
		}
		dbPublicIds[publicId] = struct{}{}
	}

	for _, file := range files {
		fileName := file.Name()
		if file.IsDir() || fileName == "master.sqlite" {
			continue
		}
		if len(fileName) > 11 && fileName[:5] == "user_" && fileName[len(fileName)-7:] == ".sqlite" {
			publicId := fileName[5 : len(fileName)-7]
			if _, exists := dbPublicIds[publicId]; !exists {
				if err := os.Remove(fmt.Sprintf("./databases/%s", fileName)); err != nil {
					return err
				}

			}
		}
	}
	return nil
}
