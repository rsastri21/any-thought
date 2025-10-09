CREATE TYPE "public"."friend_request_status" AS ENUM('pending', 'accepted', 'rejected');--> statement-breakpoint
CREATE TABLE "friendRequests" (
	"requester" text NOT NULL,
	"requestee" text NOT NULL,
	"status" "friend_request_status",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "friendRequests_requester_requestee_pk" PRIMARY KEY("requester","requestee")
);
--> statement-breakpoint
CREATE TABLE "friends" (
	"user_id_left" text NOT NULL,
	"user_id_right" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "friends_user_id_left_user_id_right_pk" PRIMARY KEY("user_id_left","user_id_right")
);
--> statement-breakpoint
ALTER TABLE "friendRequests" ADD CONSTRAINT "friendRequests_requester_users_id_fk" FOREIGN KEY ("requester") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendRequests" ADD CONSTRAINT "friendRequests_requestee_users_id_fk" FOREIGN KEY ("requestee") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friends" ADD CONSTRAINT "friends_user_id_left_users_id_fk" FOREIGN KEY ("user_id_left") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friends" ADD CONSTRAINT "friends_user_id_right_users_id_fk" FOREIGN KEY ("user_id_right") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;