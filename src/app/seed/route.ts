/** 
 * Seeding Supabase
 */



import bcrypt from "bcrypt";
import postgres from "postgres";

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

	const defaultUsers = [
		{
			username: "admin@sync.room",
			password: "password",
			authority: "ROLE_ADMIN"
		},
		{
			username: "user@sync.room",
			password: "password",
			authority: "ROLE_USER"
		},
	]

async function seedUsers() {
	await sql`
	CREATE TABLE IF NOT EXISTS users (
	username VARCHAR(50) PRIMARY KEY NOT NULL,
	password TEXT NOT NULL
	);
	`

	const insertedUsers = await Promise.all(
		defaultUsers.map(async (u) => {
			const hashed = await bcrypt.hash(u.password, 10);
			return sql` INSERT INTO users (username, password)
			VALUES ( ${u.username}, ${hashed})
			ON CONFLICT (username) DO NOTHING;
			`
		}),
	).then(async () => {
	})
	return insertedUsers;
}


async function createAuth() {

	await sql`CREATE TABLE IF NOT EXISTS authorities (
		username VARCHAR(50) NOT NULL,
		authority VARCHAR(50) NOT NULL,
		CONSTRAINT fk_user FOREIGN KEY(username) REFERENCES users(username)
	);
	`


	return await Promise.all(
		defaultUsers.map(async u => {
			return sql`
			INSERT INTO authorities (username, authority)
			VALUES (${u.username}, ${u.authority})
			ON CONFLICT (username, authority) DO NOTHING;
			`
		})
	);
}


async function createUserIdx() {

	await sql`CREATE UNIQUE INDEX IF NOT EXISTS ix_auth_username ON authorities (username,authority);`
}
async function seedRooms() {
	// await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

	await sql` 
	CREATE TABLE IF NOT EXISTS rooms (
		id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
		name VARCHAR(255) NOT NULL UNIQUE,
		description TEXT,
		start_datetime TIMESTAMPTZ,
		end_datetime TIMESTAMPTZ
	);
	`

	const defaultRooms = [
		{
			name: "Coconut",
			description: "Tropical coconut oil podcast studio.",
		},
		{
			name: "Surf",
			description: "A Big Surf Board Room.",
		},
		{
			name: "Tower",
			description: "Room to broadcast your idea.",
		},
	]
	const insertedRooms = await Promise.all(
		defaultRooms.map(async r => {
			await sql`
			INSERT INTO rooms (name, description)
			VALUES (${r.name}, ${r.description})
			ON CONFLICT (name) DO NOTHING;
			`
		})
	)
	return insertedRooms;
}

async function createBookings(){

	await sql`
	CREATE TABLE IF NOT EXISTS bookings (
		username VARCHAR(50) NOT NULL,
		room_id UUID NOT NULL,
		PRIMARY KEY (username, room_id),
		CONSTRAINT fk_booking_user FOREIGN KEY (username) REFERENCES users(username),
		CONSTRAINT fk_booking_room FOREIGN KEY (room_id) REFERENCES rooms(id) 
	);
	`
}

export async function GET() {
	try {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const result = await sql.begin((sql) => [
			seedUsers(),
			createAuth(),
			createUserIdx(),
			seedRooms(),
			createBookings(),
		]);
		return Response.json({ message: "Database seeded successfully" })
	} catch (error) {
		return Response.json({ error }, { status: 500 });
	}
}