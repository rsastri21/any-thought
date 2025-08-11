CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text,
	"name" varchar(256) NOT NULL,
	"email" text,
	"password" text NOT NULL,
	"salt" text NOT NULL,
	"image" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
