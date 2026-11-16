import * as SQLite from 'expo-sqlite'

export type NoteType = 'text' | 'voice'

export interface LockSession {
  id: number
  startAt: number
  endAt: number
  durationHours: number
  unlockCode: string | null
  status: 'active' | 'completed' | 'unlocked_early'
  createdAt: number
}

export interface EmergencyContact {
  id: number
  name: string
  phone: string
  createdAt: number
}

export interface Note {
  id: number
  sessionId: number
  type: NoteType
  content: string | null
  audioUri: string | null
  createdAt: number
}

export interface Photo {
  id: number
  sessionId: number
  uri: string
  createdAt: number
}

type DbSession = {
  id: number
  start_at: number
  end_at: number
  duration_hours: number
  unlock_code: string | null
  status: string
  created_at: number
}

type DbContact = {
  id: number
  name: string
  phone: string
  created_at: number
}

type DbNote = {
  id: number
  session_id: number
  type: NoteType
  content: string | null
  audio_uri: string | null
  created_at: number
}

type DbPhoto = {
  id: number
  session_id: number
  uri: string
  created_at: number
}

const DB_NAME = 'drunkphoneblocker.db'
let db: SQLite.SQLiteDatabase | null = null

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME)
  }
  return db
}

export async function closeDb() {
  if (db) {
    await db.closeAsync()
    db = null
  }
}

export async function initDb() {
  const database = await getDb()
  await database.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS lock_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      start_at INTEGER NOT NULL,
      end_at INTEGER NOT NULL,
      duration_hours REAL NOT NULL,
      unlock_code TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS emergency_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('text', 'voice')),
      content TEXT,
      audio_uri TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES lock_sessions(id)
    );

    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      uri TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES lock_sessions(id)
    );
  `)
}

function mapSession(row: DbSession): LockSession {
  return {
    id: row.id,
    startAt: row.start_at,
    endAt: row.end_at,
    durationHours: row.duration_hours,
    unlockCode: row.unlock_code,
    status: row.status as LockSession['status'],
    createdAt: row.created_at,
  }
}

function mapContact(row: DbContact): EmergencyContact {
  return { id: row.id, name: row.name, phone: row.phone, createdAt: row.created_at }
}

function mapNote(row: DbNote): Note {
  return {
    id: row.id,
    sessionId: row.session_id,
    type: row.type,
    content: row.content,
    audioUri: row.audio_uri,
    createdAt: row.created_at,
  }
}

function mapPhoto(row: DbPhoto): Photo {
  return { id: row.id, sessionId: row.session_id, uri: row.uri, createdAt: row.created_at }
}

export async function createSession(
  durationHours: number,
  unlockCode: string | null
): Promise<number> {
  const database = await getDb()
  const now = Date.now()
  const endAt = now + durationHours * 3600 * 1000
  const result = await database.runAsync(
    `INSERT INTO lock_sessions (start_at, end_at, duration_hours, unlock_code, status, created_at)
     VALUES (?, ?, ?, ?, 'active', ?)`,
    now,
    endAt,
    durationHours,
    unlockCode,
    now
  )
  return result.lastInsertRowId
}

export async function getActiveSession(): Promise<LockSession | null> {
  const database = await getDb()
  const rows = await database.getAllAsync<DbSession>(
    `SELECT * FROM lock_sessions WHERE status = 'active' ORDER BY id DESC LIMIT 1`
  )
  return rows.length ? mapSession(rows[0]) : null
}

export async function getLatestSession(): Promise<LockSession | null> {
  const database = await getDb()
  const rows = await database.getAllAsync<DbSession>(
    `SELECT * FROM lock_sessions ORDER BY id DESC LIMIT 1`
  )
  return rows.length ? mapSession(rows[0]) : null
}

export async function getSession(id: number): Promise<LockSession | null> {
  const database = await getDb()
  const rows = await database.getAllAsync<DbSession>(
    `SELECT * FROM lock_sessions WHERE id = ?`,
    id
  )
  return rows.length ? mapSession(rows[0]) : null
}

export async function completeSession(id: number) {
  const database = await getDb()
  await database.runAsync(
    `UPDATE lock_sessions SET status = 'completed' WHERE id = ?`,
    id
  )
}

export async function unlockSessionEarly(id: number) {
  const database = await getDb()
  await database.runAsync(
    `UPDATE lock_sessions SET status = 'unlocked_early' WHERE id = ?`,
    id
  )
}

export async function addContact(name: string, phone: string): Promise<number> {
  const database = await getDb()
  const now = Date.now()
  const result = await database.runAsync(
    `INSERT INTO emergency_contacts (name, phone, created_at) VALUES (?, ?, ?)`,
    name,
    phone,
    now
  )
  return result.lastInsertRowId
}

export async function getContacts(): Promise<EmergencyContact[]> {
  const database = await getDb()
  const rows = await database.getAllAsync<DbContact>(
    `SELECT * FROM emergency_contacts ORDER BY id DESC`
  )
  return rows.map(mapContact)
}

export async function deleteContact(id: number) {
  const database = await getDb()
  await database.runAsync(`DELETE FROM emergency_contacts WHERE id = ?`, id)
}

export async function addNote(
  sessionId: number,
  type: NoteType,
  content: string | null,
  audioUri: string | null
): Promise<number> {
  const database = await getDb()
  const now = Date.now()
  const result = await database.runAsync(
    `INSERT INTO notes (session_id, type, content, audio_uri, created_at) VALUES (?, ?, ?, ?, ?)`,
    sessionId,
    type,
    content,
    audioUri,
    now
  )
  return result.lastInsertRowId
}

export async function getNotes(sessionId: number): Promise<Note[]> {
  const database = await getDb()
  const rows = await database.getAllAsync<DbNote>(
    `SELECT * FROM notes WHERE session_id = ? ORDER BY created_at DESC`,
    sessionId
  )
  return rows.map(mapNote)
}

export async function deleteNote(id: number) {
  const database = await getDb()
  await database.runAsync(`DELETE FROM notes WHERE id = ?`, id)
}

export async function addPhoto(sessionId: number, uri: string): Promise<number> {
  const database = await getDb()
  const now = Date.now()
  const result = await database.runAsync(
    `INSERT INTO photos (session_id, uri, created_at) VALUES (?, ?, ?)`,
    sessionId,
    uri,
    now
  )
  return result.lastInsertRowId
}

export async function getPhotos(sessionId: number): Promise<Photo[]> {
  const database = await getDb()
  const rows = await database.getAllAsync<DbPhoto>(
    `SELECT * FROM photos WHERE session_id = ? ORDER BY created_at DESC`,
    sessionId
  )
  return rows.map(mapPhoto)
}

export async function deletePhoto(id: number) {
  const database = await getDb()
  await database.runAsync(`DELETE FROM photos WHERE id = ?`, id)
}

export async function clearContacts() {
  const database = await getDb()
  await database.runAsync(`DELETE FROM emergency_contacts`)
}
