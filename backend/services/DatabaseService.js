const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

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
          symptom TEXT,
          responses TEXT,
          appointment_time DATETIME,
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

        // Doctors table
        `CREATE TABLE IF NOT EXISTS doctors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          name TEXT,
          password_hash TEXT NOT NULL,
          password_salt TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
            // After base tables exist, ensure migrations like missing columns
            this.ensurePatientsSeverityColumn()
              .then(() => this.ensurePatientsCaseColumns())
              .then(() => {
                console.log("All tables created successfully");
                resolve();
              })
              .catch((migrationErr) => {
                console.error("Error ensuring severity column:", migrationErr);
                // Continue resolving even if migration failed to avoid blocking startup
                resolve();
              });
          }
        });
      });
    });
  }

  async ensurePatientsSeverityColumn() {
    return new Promise((resolve, reject) => {
      this.db.all("PRAGMA table_info(patients)", (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        const hasSeverity = rows.some((col) => col.name === "severity");
        if (hasSeverity) {
          resolve();
          return;
        }
        this.db.run(
          "ALTER TABLE patients ADD COLUMN severity TEXT",
          (alterErr) => {
            if (alterErr) {
              reject(alterErr);
            } else {
              console.log("Added severity column to patients table");
              resolve();
            }
          }
        );
      });
    });
  }

  async ensurePatientsCaseColumns() {
    return new Promise((resolve, reject) => {
      this.db.all("PRAGMA table_info(patients)", (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        const hasSymptom = rows.some((col) => col.name === "symptom");
        const hasResponses = rows.some((col) => col.name === "responses");
        const hasApptTime = rows.some((col) => col.name === "appointment_time");

        const migrations = [];
        if (!hasSymptom) migrations.push(["ALTER TABLE patients ADD COLUMN symptom TEXT"]);
        if (!hasResponses) migrations.push(["ALTER TABLE patients ADD COLUMN responses TEXT"]);
        if (!hasApptTime) migrations.push(["ALTER TABLE patients ADD COLUMN appointment_time DATETIME"]);

        if (migrations.length === 0) {
          resolve();
          return;
        }

        let done = 0;
        migrations.forEach(([sql]) => {
          this.db.run(sql, (alterErr) => {
            if (alterErr) console.error("Case column migration error:", alterErr.message);
            done++;
            if (done === migrations.length) resolve();
          });
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
                updated_at = CURRENT_TIMESTAMP
            WHERE socket_id = ?
          `;
            this.db.run(
              updateQuery,
              [
                patientData.name,
                patientData.email,
                patientData.phone,
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
            INSERT INTO patients (socket_id, name, email, phone) 
            VALUES (?, ?, ?, ?)
          `;
            this.db.run(
              insertQuery,
              [
                socketId,
                patientData.name,
                patientData.email,
                patientData.phone,
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

  async createOrUpdatePatientByEmail(email, patientData = {}) {
    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT * FROM patients WHERE email = ?",
        [email],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          if (row) {
            const updateQuery = `
            UPDATE patients 
            SET name = COALESCE(?, name), 
                phone = COALESCE(?, phone),
                socket_id = COALESCE(?, socket_id),
                updated_at = CURRENT_TIMESTAMP
            WHERE email = ?
          `;
            this.db.run(
              updateQuery,
              [patientData.name, patientData.phone, patientData.socketId || null, email],
              function (err) {
                if (err) {
                  reject(err);
                } else {
                  resolve({ id: row.id, ...row, ...patientData });
                }
              }
            );
          } else {
            const insertQuery = `
            INSERT INTO patients (socket_id, name, email, phone) 
            VALUES (?, ?, ?, ?)
          `;
            this.db.run(
              insertQuery,
              [patientData.socketId || null, patientData.name, email, patientData.phone],
              function (err) {
                if (err) {
                  reject(err);
                } else {
                  resolve({ id: this.lastID, name: patientData.name, email, phone: patientData.phone });
                }
              }
            );
          }
        }
      );
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

  async updatePatientSeverity(patientId, severity) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE patients
        SET severity = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      this.db.run(query, [severity, patientId], function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
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

  async updatePatientCaseData(patientId, { symptom, responses, severity, appointment_time }) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE patients
        SET symptom = COALESCE(?, symptom),
            responses = COALESCE(?, responses),
            severity = COALESCE(?, severity),
            appointment_time = COALESCE(?, appointment_time),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      this.db.run(
        query,
        [symptom || null, responses ? JSON.stringify(responses) : null, severity || null, appointment_time || null, patientId],
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve({ changes: this.changes });
          }
        }
      );
    });
  }

  async listPatients({ search, severity, sort, limit = 100, offset = 0 }) {
    return new Promise((resolve, reject) => {
      const whereClauses = [];
      const params = [];

      if (search) {
        const trimmed = String(search).trim();
        const idNum = Number(trimmed);
        if (!isNaN(idNum)) {
          whereClauses.push("(id = ? OR name LIKE ?)");
          params.push(idNum, `%${trimmed}%`);
        } else {
          whereClauses.push("(name LIKE ?)");
          params.push(`%${trimmed}%`);
        }
      }

      if (severity) {
        const sev = String(severity).toUpperCase();
        whereClauses.push("(severity = ?)");
        params.push(sev);
      }

      const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

      let orderBy = "ORDER BY updated_at DESC";
      if (sort === "severity") {
        orderBy = `ORDER BY CASE severity WHEN 'CRITICAL' THEN 1 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 3 ELSE 4 END, updated_at DESC`;
      }

      const sql = `
        SELECT 
          p.id,
          p.name,
          p.email,
          COALESCE(p.symptom, (
            SELECT ps.symptom_name FROM patient_symptoms ps 
            WHERE ps.patient_id = p.id 
            ORDER BY ps.created_at DESC LIMIT 1
          )) AS symptom,
          p.severity,
          COALESCE(p.appointment_time, (
            SELECT a.scheduled_time FROM appointments a 
            WHERE a.patient_id = p.id 
            ORDER BY a.created_at DESC LIMIT 1
          )) AS appointment_time,
          p.responses,
          p.updated_at
        FROM patients p
        ${whereSql}
        ${orderBy}
        LIMIT ? OFFSET ?
      `;
      params.push(Number(limit), Number(offset));

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const mapped = rows.map((row) => ({
            id: row.id,
            name: row.name,
            email: row.email,
            symptom: row.symptom,
            severity: row.severity,
            appointment_time: row.appointment_time,
            appointment: row.appointment_time,
            responses: row.responses ? this._safeJsonParse(row.responses) : null,
            updated_at: row.updated_at,
          }));
          resolve(mapped);
        }
      });
    });
  }

  _safeJsonParse(jsonString) {
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      return null;
    }
  }

  // Doctor auth methods
  async getDoctorByEmail(email) {
    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT * FROM doctors WHERE email = ?",
        [email],
        (err, row) => {
          if (err) return reject(err);
          resolve(row || null);
        }
      );
    });
  }

  async createDoctor({ email, name, password }) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = await this._hashPassword(password, salt);
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO doctors (email, name, password_hash, password_salt)
        VALUES (?, ?, ?, ?)
      `;
      this.db.run(query, [email, name || null, hash, salt], function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, email, name });
        }
      });
    });
  }

  async validateDoctorCredentials(email, password) {
    const doctor = await this.getDoctorByEmail(email);
    if (!doctor) return null;
    const ok = await this._verifyPassword(password, doctor.password_salt, doctor.password_hash);
    if (!ok) return null;
    return { id: doctor.id, email: doctor.email, name: doctor.name };
  }

  _hashPassword(password, salt) {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, 120000, 32, "sha256", (err, derivedKey) => {
        if (err) return reject(err);
        resolve(derivedKey.toString("hex"));
      });
    });
  }

  async _verifyPassword(password, salt, expectedHash) {
    const hash = await this._hashPassword(password, salt);
    // constant-time compare
    const a = Buffer.from(hash, "hex");
    const b = Buffer.from(expectedHash, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
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
