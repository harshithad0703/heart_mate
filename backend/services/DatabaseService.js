const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

class DatabaseService {
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, "../database/tricog_health.db");
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      // Ensure database directory exists
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error("Error opening database:", err);
          reject(err);
        } else {
          console.log("Connected to SQLite database");
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    return new Promise((resolve, reject) => {
      const queries = [
        // Symptoms table
        `CREATE TABLE IF NOT EXISTS symptoms (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          follow_up_questions TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        // Patients table
        `CREATE TABLE IF NOT EXISTS patients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          socket_id TEXT UNIQUE,
          name TEXT,
          email TEXT,
          phone TEXT,
          severity TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        // Patient symptoms table
        `CREATE TABLE IF NOT EXISTS patient_symptoms (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          patient_id INTEGER,
          symptom_name TEXT NOT NULL,
          responses TEXT NOT NULL,
          status TEXT DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (patient_id) REFERENCES patients (id)
        )`,

        // Chat history table
        `CREATE TABLE IF NOT EXISTS chat_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          patient_id INTEGER,
          message TEXT NOT NULL,
          sender TEXT NOT NULL,
          message_type TEXT DEFAULT 'text',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (patient_id) REFERENCES patients (id)
        )`,

        // Appointments table
        `CREATE TABLE IF NOT EXISTS appointments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          patient_id INTEGER,
          calendar_event_id TEXT,
          scheduled_time DATETIME,
          status TEXT DEFAULT 'scheduled',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (patient_id) REFERENCES patients (id)
        )`,
      ];

      let completed = 0;
      queries.forEach((query, index) => {
        this.db.run(query, (err) => {
          if (err) {
            console.error(`Error creating table ${index}:`, err);
            reject(err);
            return;
          }
          completed++;
          if (completed === queries.length) {
            // Run lightweight migrations (add columns if missing)
            this.ensureSeverityColumn()
              .then(() => {
                console.log("All tables created successfully");
                resolve();
              })
              .catch((migrationErr) => {
                console.warn(
                  "Warning: schema migration encountered an issue (continuing):",
                  migrationErr
                );
                resolve();
              });
          }
        });
      });
    });
  }

  ensureSeverityColumn() {
    return new Promise((resolve, reject) => {
      this.db.all("PRAGMA table_info(patients)", (err, rows) => {
        if (err) return reject(err);
        const hasSeverity = rows.some((col) => col.name === "severity");
        if (hasSeverity) return resolve();

        const alter = `ALTER TABLE patients ADD COLUMN severity TEXT`;
        this.db.run(alter, (alterErr) => {
          if (alterErr) return reject(alterErr);
          console.log("Added missing column 'severity' to patients table");
          resolve();
        });
      });
    });
  }

  async seedSymptoms(symptomsData) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO symptoms (name, follow_up_questions) 
        VALUES (?, ?)
      `);

      let completed = 0;
      symptomsData.forEach((symptomData) => {
        const followUpQuestions = JSON.stringify(
          symptomData.follow_up_questions
        );
        stmt.run([symptomData.symptom, followUpQuestions], (err) => {
          if (err) {
            console.error("Error inserting symptom:", err);
            reject(err);
            return;
          }
          completed++;
          if (completed === symptomsData.length) {
            stmt.finalize();
            console.log(`Seeded ${completed} symptoms successfully`);
            resolve();
          }
        });
      });
    });
  }

  async getAllSymptoms() {
    return new Promise((resolve, reject) => {
      this.db.all("SELECT * FROM symptoms ORDER BY name", (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const symptoms = rows.map((row) => ({
            id: row.id,
            name: row.name,
            follow_up_questions: JSON.parse(row.follow_up_questions),
          }));
          resolve(symptoms);
        }
      });
    });
  }

  async getSymptomByName(symptomName) {
    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT * FROM symptoms WHERE name = ?",
        [symptomName],
        (err, row) => {
          if (err) {
            reject(err);
          } else if (row) {
            resolve({
              id: row.id,
              name: row.name,
              follow_up_questions: JSON.parse(row.follow_up_questions),
            });
          } else {
            resolve(null);
          }
        }
      );
    });
  }

  async createOrUpdatePatient(socketId, patientData = {}) {
    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT * FROM patients WHERE socket_id = ?",
        [socketId],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          if (row) {
            // Update existing patient
            const updateQuery = `
            UPDATE patients 
            SET name = COALESCE(?, name), 
                email = COALESCE(?, email), 
                phone = COALESCE(?, phone),
                severity = COALESCE(?, severity),
                updated_at = CURRENT_TIMESTAMP
            WHERE socket_id = ?
          `;
            this.db.run(
              updateQuery,
              [
                patientData.name,
                patientData.email,
                patientData.phone,
                patientData.severity,
                socketId,
              ],
              function (err) {
                if (err) {
                  reject(err);
                } else {
                  resolve({ id: row.id, ...patientData });
                }
              }
            );
          } else {
            // Create new patient
            const insertQuery = `
            INSERT INTO patients (socket_id, name, email, phone, severity) 
            VALUES (?, ?, ?, ?, ?)
          `;
            this.db.run(
              insertQuery,
              [
                socketId,
                patientData.name,
                patientData.email,
                patientData.phone,
                patientData.severity,
              ],
              function (err) {
                if (err) {
                  reject(err);
                } else {
                  resolve({ id: this.lastID, ...patientData });
                }
              }
            );
          }
        }
      );
    });
  }

  async updatePatientSeverity(patientId, severityLabel) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE patients
        SET severity = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      this.db.run(query, [severityLabel, patientId], function (err) {
        if (err) return reject(err);
        resolve({ success: true, changes: this.changes });
      });
    });
  }

  async getPatientBySocketId(socketId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT * FROM patients WHERE socket_id = ?",
        [socketId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  }

  async savePatientSymptom(patientId, symptomName, responses) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO patient_symptoms (patient_id, symptom_name, responses) 
        VALUES (?, ?, ?)
      `;
      this.db.run(
        query,
        [patientId, symptomName, JSON.stringify(responses)],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id: this.lastID });
          }
        }
      );
    });
  }

  async saveChatMessage(patientId, message, sender, messageType = "text") {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO chat_history (patient_id, message, sender, message_type) 
        VALUES (?, ?, ?, ?)
      `;
      this.db.run(
        query,
        [patientId, message, sender, messageType],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id: this.lastID });
          }
        }
      );
    });
  }

  async getChatHistory(patientId, limit = 50) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM chat_history 
        WHERE patient_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
      `;
      this.db.all(query, [patientId, limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.reverse()); // Return in chronological order
        }
      });
    });
  }

  async saveAppointment(patientId, calendarEventId, scheduledTime) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO appointments (patient_id, calendar_event_id, scheduled_time) 
        VALUES (?, ?, ?)
      `;
      this.db.run(
        query,
        [patientId, calendarEventId, scheduledTime],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id: this.lastID });
          }
        }
      );
    });
  }

  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error("Error closing database:", err);
        } else {
          console.log("Database connection closed");
        }
      });
    }
  }
}

module.exports = DatabaseService;
