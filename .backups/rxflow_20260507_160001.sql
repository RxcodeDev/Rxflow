--
-- PostgreSQL database dump
--

\restrict NjfnCKWQf6V1818QW9yg2M8lWTJESUJL4nbMzA6lqysa9MJ4LO9wtW4BLfeKF3D

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: cycle_status_enum; Type: TYPE; Schema: public; Owner: rxcode_dba
--

CREATE TYPE public.cycle_status_enum AS ENUM (
    'planificado',
    'activo',
    'completado'
);


ALTER TYPE public.cycle_status_enum OWNER TO rxcode_dba;

--
-- Name: epic_status_enum; Type: TYPE; Schema: public; Owner: rxcode_dba
--

CREATE TYPE public.epic_status_enum AS ENUM (
    'activa',
    'completada',
    'archivada'
);


ALTER TYPE public.epic_status_enum OWNER TO rxcode_dba;

--
-- Name: integration_status_enum; Type: TYPE; Schema: public; Owner: rxcode_dba
--

CREATE TYPE public.integration_status_enum AS ENUM (
    'conectado',
    'desconectado'
);


ALTER TYPE public.integration_status_enum OWNER TO rxcode_dba;

--
-- Name: member_role_enum; Type: TYPE; Schema: public; Owner: rxcode_dba
--

CREATE TYPE public.member_role_enum AS ENUM (
    'owner',
    'admin',
    'member',
    'viewer'
);


ALTER TYPE public.member_role_enum OWNER TO rxcode_dba;

--
-- Name: methodology_enum; Type: TYPE; Schema: public; Owner: rxcode_dba
--

CREATE TYPE public.methodology_enum AS ENUM (
    'scrum',
    'kanban',
    'shape_up'
);


ALTER TYPE public.methodology_enum OWNER TO rxcode_dba;

--
-- Name: notification_type_enum; Type: TYPE; Schema: public; Owner: rxcode_dba
--

CREATE TYPE public.notification_type_enum AS ENUM (
    'mention',
    'asignado',
    'comentario',
    'completado',
    'bloqueado'
);


ALTER TYPE public.notification_type_enum OWNER TO rxcode_dba;

--
-- Name: presence_enum; Type: TYPE; Schema: public; Owner: rxcode_dba
--

CREATE TYPE public.presence_enum AS ENUM (
    'online',
    'away',
    'offline'
);


ALTER TYPE public.presence_enum OWNER TO rxcode_dba;

--
-- Name: priority_enum; Type: TYPE; Schema: public; Owner: rxcode_dba
--

CREATE TYPE public.priority_enum AS ENUM (
    'urgente',
    'alta',
    'media',
    'baja'
);


ALTER TYPE public.priority_enum OWNER TO rxcode_dba;

--
-- Name: project_status_enum; Type: TYPE; Schema: public; Owner: rxcode_dba
--

CREATE TYPE public.project_status_enum AS ENUM (
    'activo',
    'pausado',
    'archivado'
);


ALTER TYPE public.project_status_enum OWNER TO rxcode_dba;

--
-- Name: task_status_enum; Type: TYPE; Schema: public; Owner: rxcode_dba
--

CREATE TYPE public.task_status_enum AS ENUM (
    'backlog',
    'en_progreso',
    'en_revision',
    'bloqueado',
    'completada'
);


ALTER TYPE public.task_status_enum OWNER TO rxcode_dba;

--
-- Name: assign_task_sequential_id(); Type: FUNCTION; Schema: public; Owner: rxcode_dba
--

CREATE FUNCTION public.assign_task_sequential_id() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  next_seq INTEGER;
BEGIN
  -- Insertar si no existe la fila de secuencia para este proyecto
  INSERT INTO project_task_sequences (project_id, last_seq)
    VALUES (NEW.project_id, 0)
    ON CONFLICT (project_id) DO NOTHING;

  -- Incrementar y obtener el siguiente valor
  UPDATE project_task_sequences
    SET last_seq = last_seq + 1
    WHERE project_id = NEW.project_id
    RETURNING last_seq INTO next_seq;

  NEW.sequential_id := next_seq;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.assign_task_sequential_id() OWNER TO rxcode_dba;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: rxcode_dba
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO rxcode_dba;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: rxcode_dba
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO rxcode_dba;

--
-- Name: activity_log; Type: TABLE; Schema: public; Owner: rxcode_dba
--

CREATE TABLE public.activity_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid,
    project_id uuid,
    user_id uuid NOT NULL,
    action character varying(100) NOT NULL,
    payload jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.activity_log OWNER TO rxcode_dba;

--
-- Name: comments; Type: TABLE; Schema: public; Owner: rxcode_dba
--

CREATE TABLE public.comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    author_id uuid NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.comments OWNER TO rxcode_dba;

--
-- Name: cycles; Type: TABLE; Schema: public; Owner: rxcode_dba
--

CREATE TABLE public.cycles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    name character varying(50) NOT NULL,
    number integer NOT NULL,
    status public.cycle_status_enum DEFAULT 'planificado'::public.cycle_status_enum NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    scope_pct integer DEFAULT 100 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_cycle_dates CHECK ((end_date > start_date)),
    CONSTRAINT cycles_scope_pct_check CHECK (((scope_pct >= 0) AND (scope_pct <= 100)))
);


ALTER TABLE public.cycles OWNER TO rxcode_dba;

--
-- Name: documents; Type: TABLE; Schema: public; Owner: rxcode_dba
--

CREATE TABLE public.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid,
    title character varying(255) NOT NULL,
    body text,
    author_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.documents OWNER TO rxcode_dba;

--
-- Name: epics; Type: TABLE; Schema: public; Owner: rxcode_dba
--

CREATE TABLE public.epics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    status public.epic_status_enum DEFAULT 'activa'::public.epic_status_enum NOT NULL,
    hill_position double precision,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    parent_epic_id uuid
);


ALTER TABLE public.epics OWNER TO rxcode_dba;

--
-- Name: integrations; Type: TABLE; Schema: public; Owner: rxcode_dba
--

CREATE TABLE public.integrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider character varying(50) NOT NULL,
    connected_as character varying(255),
    access_token_enc text,
    status public.integration_status_enum DEFAULT 'desconectado'::public.integration_status_enum NOT NULL,
    connected_by uuid,
    connected_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.integrations OWNER TO rxcode_dba;

--
-- Name: labels; Type: TABLE; Schema: public; Owner: rxcode_dba
--

CREATE TABLE public.labels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    name character varying(50) NOT NULL,
    color character varying(7) DEFAULT '#6b7280'::character varying NOT NULL
);


ALTER TABLE public.labels OWNER TO rxcode_dba;

--
-- Name: license_members; Type: TABLE; Schema: public; Owner: rxcode_dba
--

CREATE TABLE public.license_members (
    license_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(20) DEFAULT 'member'::character varying NOT NULL,
    joined_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.license_members OWNER TO rxcode_dba;

--
-- Name: licenses; Type: TABLE; Schema: public; Owner: rxcode_dba
--

CREATE TABLE public.licenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(200) NOT NULL,
    owner_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.licenses OWNER TO rxcode_dba;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: rxcode_dba
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipient_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    type public.notification_type_enum NOT NULL,
    task_id uuid,
    project_id uuid,
    message character varying(255) NOT NULL,
    read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notifications OWNER TO rxcode_dba;

--
-- Name: project_members; Type: TABLE; Schema: public; Owner: rxcode_dba
--

CREATE TABLE public.project_members (
    project_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(50) DEFAULT 'member'::character varying NOT NULL
);


ALTER TABLE public.project_members OWNER TO rxcode_dba;

--
-- Name: project_task_sequences; Type: TABLE; Schema: public; Owner: rxcode_dba
--

CREATE TABLE public.project_task_sequences (
    project_id uuid NOT NULL,
    last_seq integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.project_task_sequences OWNER TO rxcode_dba;

--
-- Name: projects; Type: TABLE; Schema: public; Owner: rxcode_dba
--

CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(4) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    extra_views jsonb DEFAULT '[]'::jsonb NOT NULL,
    methodology text DEFAULT 'kanban'::text NOT NULL,
    status text DEFAULT 'activo'::text NOT NULL
);


ALTER TABLE public.projects OWNER TO rxcode_dba;

--
-- Name: task_labels; Type: TABLE; Schema: public; Owner: rxcode_dba
--

CREATE TABLE public.task_labels (
    task_id uuid NOT NULL,
    label_id uuid NOT NULL
);


ALTER TABLE public.task_labels OWNER TO rxcode_dba;

--
-- Name: tasks; Type: TABLE; Schema: public; Owner: rxcode_dba
--

CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sequential_id integer NOT NULL,
    project_id uuid NOT NULL,
    epic_id uuid,
    cycle_id uuid,
    parent_task_id uuid,
    title character varying(255) NOT NULL,
    description text,
    status public.task_status_enum DEFAULT 'backlog'::public.task_status_enum NOT NULL,
    priority public.priority_enum DEFAULT 'media'::public.priority_enum NOT NULL,
    assignee_id uuid,
    created_by uuid NOT NULL,
    due_date date,
    completed_at timestamp with time zone,
    blocked_reason text,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.tasks OWNER TO rxcode_dba;

--
-- Name: user_notification_prefs; Type: TABLE; Schema: public; Owner: rxcode_dba
--

CREATE TABLE public.user_notification_prefs (
    user_id uuid NOT NULL,
    mentions boolean DEFAULT true NOT NULL,
    assignments boolean DEFAULT true NOT NULL,
    comments boolean DEFAULT false NOT NULL,
    updates boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_notification_prefs OWNER TO rxcode_dba;

--
-- Name: users; Type: TABLE; Schema: public; Owner: rxcode_dba
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'member'::character varying NOT NULL,
    initials character varying(4) NOT NULL,
    avatar_url character varying(500),
    last_seen_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    avatar_color character varying(20),
    presence_status text DEFAULT 'offline'::text NOT NULL
);


ALTER TABLE public.users OWNER TO rxcode_dba;

--
-- Name: wiki_pages; Type: TABLE; Schema: public; Owner: rxcode_dba
--

CREATE TABLE public.wiki_pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid,
    slug character varying(200) NOT NULL,
    title character varying(255) NOT NULL,
    content text,
    author_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.wiki_pages OWNER TO rxcode_dba;

--
-- Name: workspace_members; Type: TABLE; Schema: public; Owner: rxcode_dba
--

CREATE TABLE public.workspace_members (
    workspace_id uuid NOT NULL,
    user_id uuid NOT NULL,
    added_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.workspace_members OWNER TO rxcode_dba;

--
-- Name: workspace_projects; Type: TABLE; Schema: public; Owner: rxcode_dba
--

CREATE TABLE public.workspace_projects (
    workspace_id uuid NOT NULL,
    project_id uuid NOT NULL,
    added_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.workspace_projects OWNER TO rxcode_dba;

--
-- Name: workspaces; Type: TABLE; Schema: public; Owner: rxcode_dba
--

CREATE TABLE public.workspaces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    color text DEFAULT '#6366f1'::text NOT NULL,
    icon text DEFAULT 'layers'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    license_id uuid
);


ALTER TABLE public.workspaces OWNER TO rxcode_dba;

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: rxcode_dba
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
2b7468a5-8225-48c9-8334-88382245bdef	4f9b75fa7992e6bf4a9db343b18dd6d2b90765f620613c7819189b572d74a189	2026-04-30 18:46:04.393464+00	0_baseline		\N	2026-04-30 18:46:04.393464+00	0
31821ec8-a03e-45ef-a5d3-1b5c3ec8ccc9	91d4abe767451bb600ef60629d8dc415dbf288179b884656a11730bcf66dde0d	2026-04-30 18:46:10.609489+00	20260428000001_add_licenses		\N	2026-04-30 18:46:10.609489+00	0
\.


--
-- Data for Name: activity_log; Type: TABLE DATA; Schema: public; Owner: rxcode_dba
--

COPY public.activity_log (id, task_id, project_id, user_id, action, payload, created_at) FROM stdin;
d05a0221-8a2a-49c1-8dd4-41390ffa32bc	5ce47d36-19a0-40cd-9dc3-7f342f3e8593	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el título	\N	2026-04-22 14:02:41.353813+00
d9863b66-15b6-4c80-a0b5-5fdb65dc6554	0346c89d-ca4b-44e0-904f-f88f7130cf4d	\N	a4724453-124c-45a3-a8c5-db01560300cc	asignó una épica	\N	2026-04-22 14:18:15.349186+00
8e1c35b8-71ea-4bf7-bb33-361031a5195a	95d6f892-272d-4772-b046-11ae106b031e	\N	a4724453-124c-45a3-a8c5-db01560300cc	cambió el estado a "en_progreso"	\N	2026-04-22 14:19:11.209645+00
1fac4ace-a9b1-4eeb-aec8-b7ac5d0377f4	554750c0-6ba6-499d-993e-2fd1c2d7fffe	\N	a4724453-124c-45a3-a8c5-db01560300cc	cambió el estado a "en_progreso"	\N	2026-04-22 14:19:16.644127+00
4b4a0c20-24ca-4657-a365-b61d24b80a1e	0346c89d-ca4b-44e0-904f-f88f7130cf4d	\N	a4724453-124c-45a3-a8c5-db01560300cc	cambió la prioridad a "baja"	\N	2026-04-22 14:19:22.077234+00
46467854-3ab6-476f-b6f6-9ad659c1eeb2	5ce47d36-19a0-40cd-9dc3-7f342f3e8593	\N	a4724453-124c-45a3-a8c5-db01560300cc	cambió la prioridad a "baja"	\N	2026-04-22 14:19:24.609135+00
1737fdb3-aa4d-4ce1-ab3a-2b047c76cb51	05fb9ccf-20ef-40f2-ab07-bac3f26c4770	\N	a4724453-124c-45a3-a8c5-db01560300cc	cambió el estado a "completada"	\N	2026-04-22 14:19:48.690509+00
e1426fa7-8544-4f0a-afb8-527865e0613e	05fb9ccf-20ef-40f2-ab07-bac3f26c4770	\N	a4724453-124c-45a3-a8c5-db01560300cc	cambió el estado a "en_progreso"	\N	2026-04-22 14:20:05.086329+00
910ffaf1-7e63-4263-b923-70621a0d6df5	0c2fc291-7a14-4376-b254-c952d3b780d9	\N	a4724453-124c-45a3-a8c5-db01560300cc	cambió el estado a "en_revision"	\N	2026-04-22 14:28:41.364858+00
84731607-8366-496b-830d-6b2c7df1a597	a1ceb92b-7d63-469a-946b-5d2c00998739	\N	a4724453-124c-45a3-a8c5-db01560300cc	cambió el estado a "en_progreso"	\N	2026-04-22 14:51:08.066727+00
bad3d9ec-c877-49fe-8095-21ef0adc8685	554750c0-6ba6-499d-993e-2fd1c2d7fffe	\N	a4724453-124c-45a3-a8c5-db01560300cc	cambió el estado a "en_revision"	\N	2026-04-22 14:51:19.154155+00
53ab2cea-a091-46c0-8291-39e6f5a42972	05fb9ccf-20ef-40f2-ab07-bac3f26c4770	\N	a4724453-124c-45a3-a8c5-db01560300cc	cambió el estado a "en_revision"	\N	2026-04-22 14:52:43.613646+00
e2a79be1-69aa-41ff-9cae-9c6651dd5731	6c1a4842-e874-4bcb-a6d7-78ea99cc92fe	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el título	\N	2026-04-22 15:29:06.991172+00
d0d6b457-d2b6-40de-aca9-f9164ee154cb	53b3b2c3-76b9-45f1-be9d-c59237409a8a	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el título	\N	2026-04-22 15:29:31.557208+00
b6e9b933-f381-4558-8385-ebc42aa91323	95d6f892-272d-4772-b046-11ae106b031e	\N	a4724453-124c-45a3-a8c5-db01560300cc	comentó en la tarea	\N	2026-04-22 17:26:19.420439+00
acd8195f-7dcf-4d7e-960d-fad75003ed27	95d6f892-272d-4772-b046-11ae106b031e	\N	a4724453-124c-45a3-a8c5-db01560300cc	comentó en la tarea	\N	2026-04-22 17:42:17.193697+00
a061d6a2-3fd8-4f36-be62-5e1f6f22c1c2	95d6f892-272d-4772-b046-11ae106b031e	\N	a4724453-124c-45a3-a8c5-db01560300cc	cambió el estado a "en_revision"	\N	2026-04-22 17:42:23.355531+00
e887d7f4-4212-4b47-a7b1-46afde26efd7	95d6f892-272d-4772-b046-11ae106b031e	\N	a4724453-124c-45a3-a8c5-db01560300cc	comentó en la tarea	\N	2026-04-22 17:42:35.078978+00
7afbfbb9-7bdf-4850-9884-ff616c7c644b	b36767be-07c0-41ea-b37f-5cbb410ea14e	\N	9cc69f1b-31d7-4c7b-b913-0070158ed2e3	comentó en la tarea	\N	2026-04-22 17:43:45.494488+00
35054f94-1060-4ebc-bd15-db6205fb3f50	ac92724b-3ed1-412e-8472-e6f7684a5595	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	actualizó la descripción	\N	2026-04-23 13:43:04.558904+00
978111cb-7a83-4b35-a405-4ebc587e74ae	a1ceb92b-7d63-469a-946b-5d2c00998739	\N	a4724453-124c-45a3-a8c5-db01560300cc	cambió el estado a "completada"	\N	2026-04-23 14:48:55.224594+00
f7160c2c-a24c-4cb4-8701-741744dafaec	0c2fc291-7a14-4376-b254-c952d3b780d9	\N	a4724453-124c-45a3-a8c5-db01560300cc	cambió el estado a "completada"	\N	2026-04-23 14:48:58.082232+00
08799e47-d4ce-4666-a606-3e171820151d	554750c0-6ba6-499d-993e-2fd1c2d7fffe	\N	a4724453-124c-45a3-a8c5-db01560300cc	cambió el estado a "completada"	\N	2026-04-23 14:49:02.49748+00
a7ae340e-a468-4f5a-9979-43d5db24d4bc	95d6f892-272d-4772-b046-11ae106b031e	\N	a4724453-124c-45a3-a8c5-db01560300cc	cambió el estado a "completada"	\N	2026-04-23 14:49:07.610136+00
921dc8cc-d491-4875-ba83-3565693ea4f8	ac92724b-3ed1-412e-8472-e6f7684a5595	\N	a4724453-124c-45a3-a8c5-db01560300cc	cambió el estado a "completada"	\N	2026-04-23 17:34:38.133412+00
1f2d3a48-10a7-49ff-8fd7-9649c9a3f870	9f6b64dc-aa4b-4405-bd8e-c949afd79260	\N	a4724453-124c-45a3-a8c5-db01560300cc	comentó en la tarea	\N	2026-04-24 13:29:27.942651+00
57e729ef-b096-4445-a0f1-cf1015bc9bbf	9f6b64dc-aa4b-4405-bd8e-c949afd79260	\N	a4724453-124c-45a3-a8c5-db01560300cc	comentó en la tarea	\N	2026-04-24 13:31:55.135366+00
03dc7085-8a65-46e3-812b-30d4ee8ad6b3	9f6b64dc-aa4b-4405-bd8e-c949afd79260	\N	a4724453-124c-45a3-a8c5-db01560300cc	cambió el estado a "bloqueado"	\N	2026-04-24 13:31:59.304353+00
d2bd1575-cbb2-456c-9df4-79b2695bde2b	9f6b64dc-aa4b-4405-bd8e-c949afd79260	\N	a4724453-124c-45a3-a8c5-db01560300cc	cambió la prioridad a "urgente"	\N	2026-04-24 13:32:09.05429+00
28b88c98-280c-4862-864a-7f8b0e87b81d	4d449a88-ee07-4c75-b18d-3d4bb6093917	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el título	\N	2026-04-24 15:27:38.479693+00
ec7a8c6c-32ff-4abe-8d84-111a9723756f	4d449a88-ee07-4c75-b18d-3d4bb6093917	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	actualizó la descripción	\N	2026-04-24 15:28:24.981156+00
aa475a00-1692-4ebe-9e8f-d2ba07cb0729	4d449a88-ee07-4c75-b18d-3d4bb6093917	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "en_progreso"	\N	2026-04-24 15:28:28.347647+00
892026bc-aef7-4115-9b20-4680b0dce980	4d449a88-ee07-4c75-b18d-3d4bb6093917	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la prioridad a "urgente"	\N	2026-04-24 15:28:30.975377+00
4735826b-3a38-4d7d-9837-eb82f941e391	4d449a88-ee07-4c75-b18d-3d4bb6093917	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 15:28:35.172989+00
6f972a9b-0ab5-4c8b-9fbd-96dbe8921e1d	4d449a88-ee07-4c75-b18d-3d4bb6093917	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-24 15:28:39.837269+00
8b64ff70-d60e-4b6b-a8e2-fa15c7717ba7	4d449a88-ee07-4c75-b18d-3d4bb6093917	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó una épica	\N	2026-04-24 15:28:46.991687+00
e4a8b9b9-9dd9-4bc3-8aa3-e67b1e15666e	1aed1bc6-6adb-4fbf-9531-d9bde0abdc70	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó una épica	\N	2026-04-24 15:35:29.958564+00
59635117-4375-45f6-8e86-dc47cedc550f	0bd0013c-8e91-47c9-974f-1ccb62629f18	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 16:44:53.260662+00
7e99247a-eb0e-40fd-bc21-91382e019a12	9655a268-f283-47b8-b9ee-c302540cae97	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 16:45:06.972339+00
d54cd4c0-2490-41e7-9244-4113f658590d	a276f31d-bd9b-4442-868a-b858d34fce92	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 16:45:16.531087+00
a40b716e-72a1-4cfb-8308-0048c9e89c3e	bc7763b6-5fc0-4690-8975-b554d9d8fe2c	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 16:45:27.785048+00
80edab2c-112b-432c-a300-e1e8288a2093	bd6678b9-52a6-4709-bd8d-ea9c5ad1d546	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 16:45:37.198036+00
9c66b98d-692f-4ab8-8ca5-c51af880f2b0	7b9e0a9a-4ba5-459c-80fe-55c90bc1f96e	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 16:45:58.251718+00
c2ff7870-7300-49d5-b6c2-4783205adc57	2e6006fc-2e37-4a77-a78c-91acb2a7b837	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 16:46:13.617899+00
0a8e59db-7a0c-4a1c-ac06-2347866b7336	53dca069-7858-4ba5-980b-bec5298926e7	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 16:46:24.217909+00
6a12abda-51ca-4ace-9048-744ae2e9b723	c04effd9-26c4-492f-a79b-494abb7f477f	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 16:46:43.564914+00
f5b09a80-c22f-49b2-84a6-6cbfc58e5b0a	880a132d-10eb-46b0-9235-c506fa2740fe	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 16:46:56.033922+00
8c3b9ad8-f39f-4b89-b4b1-dbc29b7520aa	89fc652a-b901-4c19-aed8-f3d3847dbcfc	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 16:47:06.932411+00
ccc27bcd-a0cb-4cbb-96ed-0e0cb12a3c4f	89b6ad41-7fa5-4a1e-b8f8-ff22b955463c	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 16:47:16.781108+00
10c66385-1987-4797-8ec3-79fd20e23f2e	f9d006e4-72e5-4fa9-93bf-a91e955c23e7	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 16:47:26.303913+00
7e04aaff-7594-4c37-b8f6-c3c21a87b064	cba8d8b5-18e9-4fda-a893-67748a81d2e4	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 16:47:38.690086+00
938567f1-0a87-475c-bc00-55ce85e9981c	151bcd2f-3d0a-4526-ba83-bd7b84110c26	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 16:47:47.060617+00
5a51a711-55f6-402d-a4d7-605a85175cfa	26999ab0-81a0-4936-a108-287577640277	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 16:47:56.628203+00
32f9043c-5a02-4766-bc38-6ae498a2a45d	6a305c83-3738-4540-b650-5456c87ed78d	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 16:48:04.844868+00
edfe38e8-a9ee-4d41-91a4-0a103c9fa569	3e224159-350b-44ee-ac8c-ecf21471ba86	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 16:48:18.307037+00
ff26182c-21d2-4654-9894-8bf66d8563a7	eb048489-cd67-4542-aaf5-d9c191de2418	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 16:48:28.502674+00
71f2136d-4ef0-4a02-a38e-3ede4305aff9	e340ebfa-8cdc-4802-b305-c0bc390a6f03	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 16:48:40.607635+00
e9c543f6-7b3c-443d-841c-e31a667f50b0	2bb4847d-dd46-40a2-9904-35390fffa4b5	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 16:48:50.612606+00
b4a04bbd-40cf-409d-9de1-f0d4e3cb5c98	f03d7be9-5ec1-47df-99e2-6f193b99d3cb	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 16:49:17.076826+00
d6bc8a26-9ac4-4f07-a38f-4fe042d24dd4	08a31b11-d2a5-4344-8b0b-942378925686	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 16:49:26.858976+00
3a422d18-7780-4ee3-ada4-a6910df99205	1c72e3ab-9e3f-42ea-a1fc-e50c75205d68	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 16:49:36.748906+00
b18410ce-7df0-4141-a3b3-2846c1e6df5c	9db77372-aca8-4b4f-a96e-7695dfb8b385	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 16:51:16.832479+00
92c7cdb4-7fee-48a2-b676-54153639fbe0	766e1969-2c5e-4f3a-b528-8bd9d439fa6a	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 16:51:27.466664+00
3263a021-ff1e-42bb-883c-471de646214f	6191c709-0f13-42d0-b69b-7d5dea237a15	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 16:51:55.125216+00
d1f6c4c0-c9a6-49b9-8e5b-2fb7ce4fb10e	94d2a2d3-3dbb-42fb-a6bf-b7521a64b79e	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 16:52:06.006451+00
c15e8d85-da81-4d64-a899-4979f85b7aa2	99eda663-28e8-47a8-907e-6504640bf583	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 16:52:16.29205+00
898b98f1-3be8-43fe-86ba-214cb90d6fb8	fc7fdf98-068a-4ce8-a895-a43f52f693a8	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 16:52:31.49229+00
f2744111-419a-4d52-8791-5c701bc037e0	0e85266e-b070-4f9f-8988-b698596ff466	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 16:52:44.132473+00
c764e3e7-419a-407b-9700-539ab5c92f3b	4e2e4bde-9ff4-41e9-8b96-402b95bd87ed	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 16:53:12.769394+00
6f62b92a-34d0-4769-8357-947986510f19	7e3e056a-f2f8-4714-8ed0-9b20b2a3d4f1	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:00:36.500765+00
6ce0b79f-d0dc-4ee4-8b4d-64ce01b0c07d	9ced7970-249a-45af-a014-bc22a05d1b3d	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:01:02.700593+00
1b300c76-631b-4497-a75b-00446679097c	12f9c9b7-8ac6-47d6-8ed6-692aac79ed2b	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:01:17.324236+00
8adaae53-66dd-47cc-8d0f-d1bc42c373ed	66698ec4-f6af-46e2-853d-c0222e93d254	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:01:46.115267+00
9a2626f0-461e-45d1-b15f-90f5f23f69d0	557bf093-b007-481e-971e-3a4b706931a2	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:02:21.166335+00
e01b6be1-de01-438c-a701-e86d91440113	11d4da69-d496-4c61-8296-09faf5031dcd	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:02:03.688246+00
2747c7eb-0dbd-4148-8f04-83037197922e	557bf093-b007-481e-971e-3a4b706931a2	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:02:26.578946+00
4b501ea2-d53c-4127-bf52-30af2de2f2e7	ee7c0f09-a510-46f8-8ed6-2c6a4f573bd7	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:03:25.339107+00
7bea00a8-bff3-4699-a48a-31dbf1de0485	c3f60323-64e8-4b33-b79c-da30cabc3c35	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:03:37.249601+00
ac5bcb9b-7af7-4b5f-9920-535745e6a544	cc1d4bb2-c12b-4b62-b076-bcdabcd8c42a	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:03:51.487023+00
bee95452-c456-4942-bb7c-91028d9e0611	9b022edf-bf6e-4998-a274-cb2c4bcfce11	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:04:04.283128+00
c1627e08-97b7-4b5e-83d1-5d4ff136c865	734aa037-c856-4eb2-8675-406adf95756f	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:04:21.579781+00
7bcdd589-1052-4406-bb33-0ee1d47d36d5	5f7ce71e-4249-4866-9ce3-93326c782d95	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:04:37.823384+00
765a697e-3bb5-47e2-b467-c16743b0c69c	5f7ce71e-4249-4866-9ce3-93326c782d95	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:04:40.690196+00
41f339ad-b907-4048-88dd-edb8d5fdaaf9	39b93a71-05f8-4a1b-8bbc-cee9efb741c3	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:04:53.091975+00
acf850e4-9c15-464e-a290-126a55c7747d	09f83fa4-398c-4790-90e6-c29b971d3d64	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:05:08.253435+00
cceec8a8-c2d9-4348-90a1-3e4de8d5f1a6	271fca9c-4dab-43a3-bc9b-fcb35382d2e5	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:05:20.233068+00
a4ab1d5a-6b4b-42f9-9a6a-3a155fb634c0	c0293ab4-2aaf-4219-8453-c25be44557b7	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:05:31.836685+00
c1fff2d5-1c08-4419-a751-52d84d57c00d	f536633f-bf77-4edc-ab47-47e8eb59633b	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:05:41.270833+00
5a96b11b-bbac-4e99-8985-ce2879fec414	2ad7c4ef-c12e-4aa9-8228-170548c99296	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:06:08.604356+00
e2b784bc-bdfb-442b-825a-f858f3e11d49	eccac48a-1117-4fa7-aa08-52484365df3f	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:06:21.855297+00
8387c517-fbbb-45bb-881c-a5c1a57bca8f	fe1fb09e-1aff-4253-b2c9-a239357cede2	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:06:36.131206+00
870f3ffa-c8ea-42f2-95a6-6037c0148a7f	a0aa320c-d24c-4499-9d17-edfcd5829d9d	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:06:53.704131+00
dfc06099-08e8-4f37-b42c-8ffcc080255f	a0aa320c-d24c-4499-9d17-edfcd5829d9d	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:07:09.454408+00
f06e6d70-7c2a-4028-8d28-436cf8bfd426	fe1fb09e-1aff-4253-b2c9-a239357cede2	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:07:23.094158+00
02b06f0b-e21e-429c-8424-4c4bd281f95c	ea086951-8124-45ca-b635-006ca7da4841	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:07:42.262708+00
5570b614-4e86-4ecf-9637-eb7bdb284f16	4e7f5f86-3f93-4da2-8959-3e7beb8cf198	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:07:58.367068+00
65ed491e-c9c5-41a7-983a-ee00054adef2	6f90425b-bd58-4538-8c57-add16f785187	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:08:12.249167+00
a28e6577-d2cc-453d-b5b0-881726a613d0	50cb1b34-efc4-487d-874b-4506181b2f66	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:08:26.307501+00
2079630a-9f4d-4009-9164-f5a8ebb4c26a	bc85920f-fd7d-4151-9d24-03f73cd3ea7d	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:08:42.114615+00
f1143be9-9bd6-4f2b-b526-a2b52a0138be	22ba8246-efea-4d75-8b8d-bee18f0b09df	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:08:57.262826+00
723ee973-ab2b-49ad-9563-ef615c7fa4fe	48a40fed-2aa7-42a5-8242-f1faeb8a3ef1	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:09:15.176493+00
c22f6316-a765-41e8-aced-df196389ef91	2363e99e-cc42-459a-947d-43da12dfe9e0	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:09:32.58877+00
53115c24-508c-4e7c-bf2b-2d22f26761bd	016ff391-0e8f-406c-af8b-ee25874e8c03	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:18:40.564178+00
6affc9ec-1ea0-4547-8721-0e3dddf4f177	ebfe3306-0111-4f5a-bc46-99e8d81f865e	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:18:56.102974+00
62b1cd3b-a617-43e8-93fc-b94dbd2c7469	b016ed6e-c21b-42ef-afd2-212880b48438	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:19:12.238563+00
7fb57c2f-b2c0-4aea-92f6-df863336df9c	d1709e12-08e4-42d4-80b7-9360901d9727	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:19:33.135045+00
cd9af006-f24e-4cd8-921e-dc763e58d90a	7b4a91ce-77c3-4c64-b2a8-5d3333e676ad	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:19:45.262119+00
80650406-8371-4edd-b5c5-696162bf3819	0d303b73-c21f-4310-bb56-acc1834a54c5	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:21:29.107528+00
350a76b8-963a-4be5-80a1-e7585fba2121	d66eb892-e7ba-4ee9-ba9f-320cc8f3e2b9	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:21:51.008307+00
d2f4d1bc-1f09-40f3-969f-8d10cb5b4620	c27b8a9f-02cf-407f-b6af-64f1003df37e	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:22:03.251839+00
5836a8ce-6105-4da8-8c14-211b4d5d29de	c936afd5-3bb3-4d95-b428-fcf1feab2794	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:22:15.122275+00
a731d1b2-e214-4950-8aca-195cd02fb03a	1d027e1a-6ee8-4fbd-9f1d-2bc17640dbe0	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:22:42.430512+00
c866c6a7-13fa-4c6d-9b3c-0a1387e69b17	663b015c-0a25-44f9-bf5f-c47c9e216968	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:23:14.995566+00
a15754a8-1b20-4e2f-892e-d4f696ebe784	ba9c51de-b85d-46ff-b836-678e4e9df285	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:23:33.673493+00
2f43ddf8-5695-4a93-85a5-483b6819f6d3	33ea391c-23a5-4dd0-a05a-adc18e034b00	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:23:45.998003+00
8845eddb-8feb-4789-9f47-233f49738a03	f3859a7b-132d-4328-9dbd-99d6232f5498	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:23:56.879372+00
bf4946c9-3c46-4d8c-8ae6-9d9990e9db99	eec4e210-84c3-49a9-a680-827f8da5600a	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:24:11.07512+00
ab0bf418-3254-4dde-a506-3d2393d51841	4d2810d7-ea9f-49d9-8ec5-5bdb9643300a	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:24:22.099011+00
2bbc862d-793c-49c7-b559-edb8373a1c68	5e35e541-fc56-4942-96f0-e051205b6daf	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:24:35.279927+00
7767526d-faf9-42cb-baf6-663bd58031af	d7b66a93-eea2-4a64-b321-59763a3f58e4	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:24:49.193023+00
475a99bf-ba9c-4bf2-a633-36120dd16586	441e3fb9-915d-4ba6-895e-d753dc2d5e27	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:25:03.392451+00
1f65a265-9b37-45e5-a125-d8a8a67b2482	d4b44294-cd00-4e76-89af-fc645e655ea2	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:25:23.419566+00
ec3f1a61-aa88-417e-8017-75b5fdc1a721	0f50d98f-7899-44f9-8499-52b18359a064	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:25:43.833134+00
44503b9e-2fd8-443b-81a0-5ed0469e215c	ddea503b-ed03-4b35-8e48-22f4d56c9f99	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:25:55.01199+00
51176bb4-2c90-42cb-90ff-d6fc50cfccbd	347c63c8-e661-4d79-8050-4e0074e2af97	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:26:08.125417+00
13c069ec-1835-4491-84a7-f51e062ac6c6	834bc3ec-9916-42d5-992a-a587d790f620	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:26:22.571008+00
ff664c00-e9fc-4fb5-947a-3bfbb8fb6114	7e83c67d-10b4-49e9-8c8b-964a3f3626a5	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:26:37.099937+00
d0ada805-833d-41d7-976b-a8c6b810e641	7092821f-73b6-4053-a0b1-26b61507d553	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:26:52.98821+00
dfe3441d-bf9f-4c09-8431-e37d7173bfba	62f99d8a-071e-4002-bd31-ef1201d78aaf	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:27:49.09573+00
62ff23c8-5486-47b7-bd9d-79eb88901603	dda8c736-9568-487a-baa2-cc3eca7f38e1	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:28:14.044346+00
07ff9a97-5b4d-4c88-9115-1e36c69123e2	6825af05-9ac8-4ead-930f-65c661feb7cd	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:28:34.906653+00
e75a5da5-f8d8-4bf8-9722-a784398ffff1	006890db-0d14-4d77-abdf-743e48dbda1b	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:28:51.658162+00
1034a6ca-1b93-40eb-9158-0b31952d28fd	85a306ca-d6df-4fb2-9227-e128479d0b68	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:29:07.144618+00
8c06a104-8bad-4d49-b730-9b95046b013f	17b94d21-5d9a-4004-92d3-d46e03e04a0b	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:29:21.797173+00
691e5540-0d94-4684-ac9b-7edf581bd979	5ed450e4-5ccc-4ac4-a703-c5e65c551fd3	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:29:37.037262+00
a26ebe87-f54f-4329-b0d2-a97694b9626f	0804e66d-e55e-4586-9998-b89ad576a0cb	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:29:57.248586+00
f630c409-af2f-4ee4-8d28-e466e6eb41a2	e3d6bbdc-5504-4ac7-b552-ad5e2b19ac10	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:30:20.833697+00
2e98445d-d73f-4d5f-a6bb-b8cdbea49b07	beb52a27-90ef-4af9-9761-fa44cf3c9ac8	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	actualizó la descripción	\N	2026-04-24 17:36:48.75739+00
9cd225bf-7f8d-42d2-8ead-6b394ca9a4da	4f49c550-2875-4327-831f-856868637a45	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:37:33.289776+00
f88d3bae-b2e5-4ae9-b06c-5a6916b3d086	6e75f224-76ae-440d-9ee7-c524d4c6d684	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:37:45.082156+00
53d2e43c-79a8-4dad-adbb-bf5fb75b306d	0d3f69f1-06d0-4789-836f-08a60a5eaa71	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:37:56.026698+00
8a5a69b1-e0db-4fe1-9f5f-7f8d476468c2	771eb496-db99-4292-a2f1-143e72273752	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:38:11.427778+00
4ca44597-091d-4ca6-9282-1b980524a031	938eafe8-3f1c-4fb4-b13e-359a3cfb2631	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:38:31.123328+00
ba146682-2fd4-451b-9fe1-c6a40a6e1d82	e05d31de-db68-42a9-b7c6-25235d714238	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:38:42.628419+00
0b207eb5-d9a5-4943-a48a-84b2c315c8fe	5f2b9e1d-dd05-44f7-ac04-193e1ff129b7	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:38:51.71449+00
d22400df-9116-4aa9-a0b6-345beb64a68a	277621d2-356b-4641-8b12-e7bcbaf0ead4	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:39:02.683579+00
4613d60c-ff48-453f-8359-938c25ffc79e	5f6cd8b2-f0b5-4bda-80b3-d69be7af466a	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:39:12.18393+00
2449a787-0c0b-43f8-9798-f0a07305a56d	fd2d4f7b-b346-45a3-82da-6f5566d8cc4d	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:39:22.843124+00
997ce3eb-4db3-4738-a4f3-5a83e66ce9b5	cf8ace6b-89d7-4a24-bcac-1f2278a4ca7a	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:39:32.3103+00
68f168d6-8112-483b-a73a-3856402969ff	714817c0-c2f3-4070-87bb-60e8dcbfc87d	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-24 17:39:48.153184+00
9376f886-c6b9-4f94-8049-57015a3ec8ff	5ce47d36-19a0-40cd-9dc3-7f342f3e8593	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	comentó en la tarea	\N	2026-04-27 16:41:27.206578+00
35dc0c01-0dc8-4cf4-8956-99341c0a6570	00426212-7970-4492-a992-1d4c8bedebe3	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-04-27 16:41:52.133526+00
dfd6ad04-5517-4fb1-92aa-b041d52a9858	00426212-7970-4492-a992-1d4c8bedebe3	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	comentó en la tarea	\N	2026-04-27 16:42:21.914549+00
16cf38c1-16ab-4283-acae-7245cb300f56	2b59fce0-ce58-4ac6-943d-f8668ef0b278	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-04-27 16:50:08.738061+00
952941f4-1192-4896-bee5-33c49b1c0408	2b59fce0-ce58-4ac6-943d-f8668ef0b278	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	comentó en la tarea	\N	2026-04-27 16:50:21.091012+00
6d75751b-1450-4997-945d-75638ee83815	beb52a27-90ef-4af9-9761-fa44cf3c9ac8	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-27 16:58:28.704508+00
13fa5c59-e11d-49ed-ae3c-29772f8f11b8	d4af2f33-4b7d-4419-9b2b-c5f42b3024a6	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "en_revision"	\N	2026-04-27 16:59:25.565015+00
01dcaa61-8381-442d-9139-335025ffd9a8	05fb9ccf-20ef-40f2-ab07-bac3f26c4770	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-04-27 17:02:36.207559+00
a36da3c5-fe8f-4333-9db6-0cf4ccfcf619	6d24453d-49a7-49f4-ae64-f2b62ca59f17	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-04-27 17:03:25.389993+00
8b392008-5a82-49dd-b436-47d391368175	92ac821f-23f1-4a3d-89af-ee3392848ffb	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-04-27 17:03:32.764202+00
47d965f0-07db-401f-9716-54a4543dd3bf	afbdb4f3-6037-4e51-8f11-a8fa49dbc3d7	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-04-27 17:03:37.464097+00
e44dba2a-6fc8-4b15-89cf-6af931bc3011	52ae1014-6278-45f9-9d6f-99519d98d948	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-04-27 17:03:40.998361+00
e17d7554-d312-4d6e-ba6f-d884e08cbb35	99973238-e312-4010-8579-eea4d9368788	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-04-27 17:03:44.712511+00
89db6525-a838-4f80-975f-337eaa71777d	82eb4e3e-e26f-4c28-87fc-5c083598fefb	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-04-27 17:03:48.882838+00
5221e3a9-1521-4385-a3e9-9efed08655b1	e194b433-2888-459e-aafd-7a96f198431c	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la prioridad a "media"	\N	2026-04-27 17:12:24.179352+00
d11f5a49-80c5-4a87-9cb8-54f9d062cfc2	e194b433-2888-459e-aafd-7a96f198431c	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el título	\N	2026-04-27 17:14:21.071747+00
834db8bf-9ed6-4283-abb0-d90c772b8ce4	a6c8d077-52fb-4630-befd-48f90b8ae62a	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	actualizó la descripción	\N	2026-04-27 17:21:03.581315+00
ad8c112c-77dd-4312-a9ae-e8c375e8cccb	144a5255-6110-4301-833c-468c57c58e94	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	actualizó la descripción	\N	2026-04-27 17:21:51.073193+00
18ea209d-e0dd-41a3-acb3-131cbbb57ea4	bbfbb3d6-844f-4a15-a55f-74023eab34cd	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	actualizó la descripción	\N	2026-04-27 17:24:19.253421+00
f139e79f-7c3a-449e-b9ae-d4b6563813dd	bbfbb3d6-844f-4a15-a55f-74023eab34cd	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	actualizó la descripción	\N	2026-04-27 17:24:35.440744+00
83fb4f8b-24ba-46c9-ac09-a3e062e09d60	9aa845ea-5735-4b84-aad3-8828e9a00f48	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	actualizó la descripción	\N	2026-04-27 17:31:42.159054+00
7b0bce38-3f0e-48bc-8cd2-17aff01f2266	f7a4b498-5769-4ea3-b5b9-637d6449cc41	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la prioridad a "urgente"	\N	2026-04-27 17:38:06.625631+00
ec9313f7-c4b6-4286-9877-00183ce3186e	4832ef7f-b72b-4802-802b-01196914a35b	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-04-27 17:38:31.561574+00
1c96c2df-e08f-4cde-b586-fb12393a929e	2c48409d-0368-49cd-9c90-97ff6c0adfcd	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-04-27 17:38:36.029442+00
3489d118-e360-408c-963e-c964ee7cddc4	e42c3b7a-b83d-4b09-bee1-d7880bf4d6ac	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-04-27 17:38:39.674805+00
8136e2c3-bb14-461f-932c-d5559bfdf74a	09ea37ca-4f6c-408a-ba44-1104394a72af	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-04-27 17:38:46.606557+00
7422ca81-6de9-472a-86e0-0f897e364191	b8753dc0-3e79-4a59-8fb8-03da46c3e71c	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-04-27 17:38:51.879254+00
85c2e6cf-3ca4-4c9e-8ac5-464cdad4ad5b	79eb18bf-c400-4793-a0f4-b69472063018	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-04-27 17:39:10.967177+00
1a67255c-832d-4c52-bb59-849e44f9849d	cdefccba-fe54-42c9-a428-de29a0a7fcf5	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-04-27 17:39:19.961092+00
9ef66d17-61e1-4716-93cb-529a5b5cbfdc	d289640b-91d8-4e00-a214-87f5dd556c81	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-04-27 17:39:27.199573+00
5862a5c4-69e7-411f-907c-ae04fbc8d3c3	b36767be-07c0-41ea-b37f-5cbb410ea14e	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-04-27 17:39:34.951461+00
8d66cd39-43ec-4b59-8ff8-eec27a5ba658	fcdfdbab-07bf-45c6-9633-2d18cb248a2a	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-04-27 17:39:41.152521+00
feca9dff-1d12-4da7-94c8-b5070ef015b9	3e5a2d93-adbe-4906-9975-b60bdad267d4	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-04-27 17:39:55.961987+00
9eb50732-0b30-4a7e-a06d-0c9e9798bbb8	35558b66-b4f5-4a4b-8640-fa8aabc670c8	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-04-27 17:40:05.354031+00
2972123f-2ff9-4a7e-a412-10b547c97410	681adb9e-54c7-433c-8d02-53ea6ff0fafd	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-04-27 17:40:14.991128+00
3b470e42-50b4-41f3-9b62-dc0ff99bc925	0ba3638a-055f-4260-85f4-db1227abcf5a	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-04-27 17:40:21.772847+00
0f26901a-9d1e-4fcf-86fb-70333aadcf5c	5b00bebb-3602-43a8-a391-8153b0484248	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "bloqueado"	\N	2026-04-27 17:40:32.44521+00
7d9a8600-6f9d-4c06-b32f-fc29a42c8327	5b00bebb-3602-43a8-a391-8153b0484248	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-04-27 17:40:35.511603+00
d1fd9446-318b-4d0a-b4c7-f1ed69d69d2f	dc2ee7ba-52e0-4cd6-a821-47d5752dd19d	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-04-27 17:40:45.812681+00
b13e541b-d8e7-414c-8ba7-b5791be14ffd	58812dc3-dec3-4161-b500-17b0819cbf25	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-04-27 17:40:53.169981+00
0fe60640-d109-4dd7-9a4d-9c4781bbac0a	a33d939e-94b5-4533-baf6-23d2b6cfafad	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-04-27 17:41:00.440393+00
62d04ae2-7224-4c93-bc8c-02302a40723a	9f6b64dc-aa4b-4405-bd8e-c949afd79260	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-04-27 17:41:12.141004+00
5fb4b87e-c5de-4c16-a7eb-36cdc8917926	2d5d6bdb-069d-4fcf-8017-b329827a4c1a	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-04-27 17:41:19.269363+00
50bf2657-4cbd-4c5d-9106-a15d1e67f4cb	29707c0b-8be6-447f-b644-103e6d292c8d	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-04-27 17:41:28.462807+00
c188bd29-d105-417a-b7c9-643085009bf3	cc1d4bb2-c12b-4b62-b076-bcdabcd8c42a	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:24:25.863842+00
ff7bca42-17f5-4af2-b1ed-cb0bf95c64e1	4f49c550-2875-4327-831f-856868637a45	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:24:57.990509+00
66c335da-fcca-4ef5-8743-47ab4556c479	6e75f224-76ae-440d-9ee7-c524d4c6d684	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:25:20.178458+00
369edbeb-c581-4b23-886c-c3e479a88fed	0d3f69f1-06d0-4789-836f-08a60a5eaa71	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:25:33.167938+00
bc467e05-8365-4a43-a1da-f0d4e500c47f	771eb496-db99-4292-a2f1-143e72273752	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:25:48.410322+00
7776f0cd-3413-4402-bbf5-b4f3cc00cde7	938eafe8-3f1c-4fb4-b13e-359a3cfb2631	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:26:03.55183+00
f90d3acb-cf25-480e-ba95-bf7d4260ef01	e05d31de-db68-42a9-b7c6-25235d714238	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:28:05.879484+00
ad8c6fcb-75b2-436e-a5e4-cf102def42f5	5f2b9e1d-dd05-44f7-ac04-193e1ff129b7	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:28:17.401152+00
54dd7a66-0599-4f6f-aa65-32e412fd8587	277621d2-356b-4641-8b12-e7bcbaf0ead4	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:28:29.75808+00
09438929-c18c-4b27-a9ed-2134b3f641a2	5f6cd8b2-f0b5-4bda-80b3-d69be7af466a	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:28:56.997611+00
9d067ccd-fc41-4243-b7d3-ded4d4a08394	fd2d4f7b-b346-45a3-82da-6f5566d8cc4d	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:29:09.361448+00
f12e335f-a567-4aac-bf82-f50504abb931	cf8ace6b-89d7-4a24-bcac-1f2278a4ca7a	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:29:21.101558+00
01d0d183-60cc-47b9-8a1b-d95b0292dd85	714817c0-c2f3-4070-87bb-60e8dcbfc87d	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:29:32.793889+00
dafea221-d481-4360-8ee4-a21daf664871	dda8c736-9568-487a-baa2-cc3eca7f38e1	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:37:11.30308+00
a0307a0e-901f-4294-a1ca-5e6a155be151	62f99d8a-071e-4002-bd31-ef1201d78aaf	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:37:33.291103+00
458b37cc-3373-4410-b39e-42b1e65b6972	7092821f-73b6-4053-a0b1-26b61507d553	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:37:45.747051+00
88d868cd-78e2-4635-b053-c7172dc8afb7	7e83c67d-10b4-49e9-8c8b-964a3f3626a5	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:37:59.680384+00
74203d86-ba6e-4455-aa85-ea12cae7aa9b	834bc3ec-9916-42d5-992a-a587d790f620	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:38:18.978864+00
718a7345-6ad5-408e-b568-0e44454f888e	347c63c8-e661-4d79-8050-4e0074e2af97	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:38:34.538247+00
e1d14c33-bfe2-46de-89fe-795868f66433	ddea503b-ed03-4b35-8e48-22f4d56c9f99	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:38:54.492128+00
6e1e4741-82d7-4073-aca8-c3f56ff0f62f	0f50d98f-7899-44f9-8499-52b18359a064	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:39:08.129469+00
0c0d5a6a-399b-4efd-9098-f274b03ff45c	bd6678b9-52a6-4709-bd8d-ea9c5ad1d546	\N	a4724453-124c-45a3-a8c5-db01560300cc	cambió el estado a "completada"	\N	2026-04-28 13:39:17.863299+00
19475554-7166-4633-a1d2-7c8afff64bb4	d4b44294-cd00-4e76-89af-fc645e655ea2	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:39:26.447448+00
0575e9fc-4087-47c8-b160-b642a64b0211	441e3fb9-915d-4ba6-895e-d753dc2d5e27	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:39:39.89177+00
c1a3dc93-9a77-4235-9cec-1aeabea91020	d7b66a93-eea2-4a64-b321-59763a3f58e4	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:40:18.330298+00
c50eba84-a837-49d2-9ad2-77f24b442fc7	5e35e541-fc56-4942-96f0-e051205b6daf	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:40:40.049397+00
c800caf7-854c-494c-8831-c5d523085c48	4d2810d7-ea9f-49d9-8ec5-5bdb9643300a	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:40:52.2877+00
d50f208d-2c56-4cfd-8cd7-9df611fe0b89	663b015c-0a25-44f9-bf5f-c47c9e216968	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:43:05.378172+00
01b077fe-ff50-47af-b10d-d6981a056215	ba9c51de-b85d-46ff-b836-678e4e9df285	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:43:17.843602+00
1676e562-3fde-4f8a-bd6d-122482dcbf26	e3d6bbdc-5504-4ac7-b552-ad5e2b19ac10	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:43:30.719662+00
77473cc1-0997-4fa8-bd1c-ec5d08ab22f0	0804e66d-e55e-4586-9998-b89ad576a0cb	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:43:44.259614+00
3de285ab-ef32-4ca3-a3df-b3fbce0db215	5ed450e4-5ccc-4ac4-a703-c5e65c551fd3	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:44:01.010385+00
8f3c7424-b511-4818-b485-b43529c01f55	17b94d21-5d9a-4004-92d3-d46e03e04a0b	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:44:17.382191+00
7fb22c30-b014-41ff-9821-717e1014e71a	85a306ca-d6df-4fb2-9227-e128479d0b68	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:44:35.705552+00
ef0477fa-a9b8-4007-94af-0a43bfeebbe5	677056b9-beaf-4c0a-a7c1-008c43de299d	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-28 13:44:50.309544+00
a753e290-6ed3-4aa8-b87c-3a95421f88fb	677056b9-beaf-4c0a-a7c1-008c43de299d	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:44:58.330955+00
317647f0-6679-45a3-8fba-87c6b9f73439	006890db-0d14-4d77-abdf-743e48dbda1b	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:45:16.11706+00
6600e2e0-8c97-420a-b28a-979676741986	6825af05-9ac8-4ead-930f-65c661feb7cd	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:45:32.746893+00
014285f1-fbb0-4932-842a-4ff65d0e665b	eec4e210-84c3-49a9-a680-827f8da5600a	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:45:47.79227+00
e88edbb0-edb5-4186-8eb8-f8b9a847992d	f3859a7b-132d-4328-9dbd-99d6232f5498	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:46:00.125421+00
5044ba77-c340-4051-a989-b616540ca29b	33ea391c-23a5-4dd0-a05a-adc18e034b00	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:46:11.227397+00
070ca088-a676-4c3e-9447-027079fe8015	89fc652a-b901-4c19-aed8-f3d3847dbcfc	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:46:46.569615+00
983f276b-4db3-4a5d-8e41-8c76ce2b616b	89fc652a-b901-4c19-aed8-f3d3847dbcfc	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:46:49.880664+00
6d706660-d117-4c62-9b5a-4aae028d862c	89b6ad41-7fa5-4a1e-b8f8-ff22b955463c	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:47:03.29384+00
9c052a23-8fa6-464b-890e-72137c8a3991	89b6ad41-7fa5-4a1e-b8f8-ff22b955463c	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:47:05.678318+00
41b7405e-a20a-4453-be1e-aa37fd448a58	f9d006e4-72e5-4fa9-93bf-a91e955c23e7	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:47:16.378359+00
a9330825-10ac-4206-a0de-96fe2cd0f9fa	f9d006e4-72e5-4fa9-93bf-a91e955c23e7	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:47:18.633336+00
54c1e8d8-9f0e-4ae2-ac7a-f47328685547	cba8d8b5-18e9-4fda-a893-67748a81d2e4	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:47:28.526315+00
84cfa30f-08aa-4c30-ac46-a1479694c607	cba8d8b5-18e9-4fda-a893-67748a81d2e4	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:47:30.643556+00
a03de5a5-8659-4e8a-a047-8aea33ddb968	151bcd2f-3d0a-4526-ba83-bd7b84110c26	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:47:42.648959+00
dc562d22-ad95-4c6d-a707-1128079b217d	151bcd2f-3d0a-4526-ba83-bd7b84110c26	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:47:44.81474+00
70a246a9-3b04-4e23-8608-e54df4bfacd3	26999ab0-81a0-4936-a108-287577640277	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:47:57.662666+00
6c866206-329d-4444-a86f-5680c4e9768a	26999ab0-81a0-4936-a108-287577640277	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:47:59.776692+00
f27b49d0-d7a8-4bea-81a8-88387573d988	6a305c83-3738-4540-b650-5456c87ed78d	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:48:15.524402+00
28da8fbf-19d7-4050-8f6a-42a5c6133f1c	6a305c83-3738-4540-b650-5456c87ed78d	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:48:17.405488+00
08e63a8f-2091-4bf3-8ea7-67df9e0e6e29	3e224159-350b-44ee-ac8c-ecf21471ba86	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:48:36.067671+00
ededa40e-761a-4254-a57c-c250ada903de	3e224159-350b-44ee-ac8c-ecf21471ba86	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:48:38.113334+00
9ad8f5bc-7ea4-4dc6-9fc0-ede72e823629	eb048489-cd67-4542-aaf5-d9c191de2418	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:48:52.075016+00
4f255365-b342-4af2-985e-244e6d9a3e5a	eb048489-cd67-4542-aaf5-d9c191de2418	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:48:53.855408+00
8d2d032f-7781-41a3-be07-40c61591639e	e340ebfa-8cdc-4802-b305-c0bc390a6f03	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:49:07.288295+00
4f390927-f165-44c2-99f5-66f7aab7e310	e340ebfa-8cdc-4802-b305-c0bc390a6f03	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:49:09.017214+00
c196f0a6-8e91-4b1f-ae42-5f5d3253bf1e	2bb4847d-dd46-40a2-9904-35390fffa4b5	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:49:22.324388+00
1b999561-549e-4e89-8807-e760512b8586	2bb4847d-dd46-40a2-9904-35390fffa4b5	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:49:23.969596+00
58114adf-47fb-4fe2-ae89-ef2787615729	f03d7be9-5ec1-47df-99e2-6f193b99d3cb	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:49:39.095214+00
1c8d25bd-8234-4d6d-8790-24f7619e5ee0	f03d7be9-5ec1-47df-99e2-6f193b99d3cb	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:49:40.664839+00
f348baf2-5991-492e-8b34-e2ab967f85c9	766e1969-2c5e-4f3a-b528-8bd9d439fa6a	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:49:52.895506+00
c9165dcd-22de-4adb-893b-3456e84a95bb	766e1969-2c5e-4f3a-b528-8bd9d439fa6a	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:49:54.70859+00
bb4f3d9c-cedd-49b1-b1ab-783f5893704d	9db77372-aca8-4b4f-a96e-7695dfb8b385	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:50:12.62944+00
e1d6df9b-1398-49a8-9f27-780686942273	9db77372-aca8-4b4f-a96e-7695dfb8b385	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:50:14.376986+00
0c4eba00-1d48-4056-b938-9e0457c322a8	1c72e3ab-9e3f-42ea-a1fc-e50c75205d68	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:50:26.826775+00
e8a93628-a801-4192-9a87-7d1f40d9efb4	1c72e3ab-9e3f-42ea-a1fc-e50c75205d68	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:50:29.492765+00
de08f065-b810-4186-856a-9dce90aca378	08a31b11-d2a5-4344-8b0b-942378925686	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:50:40.5135+00
441209b2-a9ff-49bf-94d0-5e08ce90f805	08a31b11-d2a5-4344-8b0b-942378925686	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:50:42.950781+00
907f3798-a606-448f-98cf-72fa0b609c35	7df852e8-5da4-467b-8abd-d76af283551d	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:51:05.907199+00
3308a0e9-7fbf-4acc-b7c1-e73f9e2da46c	7df852e8-5da4-467b-8abd-d76af283551d	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:51:08.009113+00
5fb980a1-fd0f-4fe3-957a-186b62ac48b6	6191c709-0f13-42d0-b69b-7d5dea237a15	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:51:35.889641+00
8db5e368-b5ee-41f2-882f-a26026c49130	6191c709-0f13-42d0-b69b-7d5dea237a15	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:51:39.150743+00
a82e5190-f7cb-434f-a70b-ff5bd1d42d62	94d2a2d3-3dbb-42fb-a6bf-b7521a64b79e	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:51:49.423927+00
5f720afb-2e98-4e51-828e-3d038d9dcceb	94d2a2d3-3dbb-42fb-a6bf-b7521a64b79e	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:51:51.777335+00
c001bbd8-22f1-43e6-b4e0-00314dc02000	99eda663-28e8-47a8-907e-6504640bf583	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:52:01.609985+00
ddd1a91f-d19f-4488-b024-d27f9f4662f2	99eda663-28e8-47a8-907e-6504640bf583	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:52:04.1572+00
b846f5b8-681e-481f-8361-d02115f7355c	fc7fdf98-068a-4ce8-a895-a43f52f693a8	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:52:26.222672+00
1a82ee91-d690-46d0-8937-c788ed17d4da	fc7fdf98-068a-4ce8-a895-a43f52f693a8	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:52:28.357842+00
f9f70d51-3c5e-45b5-94b4-d79cc2f091c6	0e85266e-b070-4f9f-8988-b698596ff466	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:52:41.787244+00
ff7378b9-ab5b-4843-a459-b99064ff6b30	0e85266e-b070-4f9f-8988-b698596ff466	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:52:43.765402+00
81a5c798-bdf1-437d-ad3b-046b926bc307	4e2e4bde-9ff4-41e9-8b96-402b95bd87ed	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:55:26.551097+00
50c24f94-4792-40ad-a2ca-dcf2f12b2487	7e3e056a-f2f8-4714-8ed0-9b20b2a3d4f1	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:55:37.37407+00
144a23ab-e80a-4c49-a178-db9c6750f0d7	9ced7970-249a-45af-a014-bc22a05d1b3d	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:55:50.028335+00
88459c6b-3582-4f0c-8d3a-dd1062c37a55	12f9c9b7-8ac6-47d6-8ed6-692aac79ed2b	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:56:01.755328+00
1302009d-87fe-4154-8dc9-1f5e3ab214fc	66698ec4-f6af-46e2-853d-c0222e93d254	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:56:14.644623+00
3c027522-b228-428f-b6d0-e5006798a458	11d4da69-d496-4c61-8296-09faf5031dcd	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:56:36.765344+00
b72804ff-caae-431d-92d9-87473cafc430	4e2e4bde-9ff4-41e9-8b96-402b95bd87ed	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	removió la fecha de entrega	\N	2026-04-28 13:56:51.453179+00
5041ff11-f2b8-4a9a-910f-0c5313584cef	4e2e4bde-9ff4-41e9-8b96-402b95bd87ed	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:56:51.971833+00
70439dc3-eaed-42c3-a971-df2e50e22c40	7e3e056a-f2f8-4714-8ed0-9b20b2a3d4f1	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:57:04.785344+00
bb5a2a44-8434-4c8c-a8d3-bfd344e9a48c	9ced7970-249a-45af-a014-bc22a05d1b3d	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:57:18.946277+00
9c586644-989f-4edc-b8a9-c771324ac0c9	12f9c9b7-8ac6-47d6-8ed6-692aac79ed2b	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:57:37.364386+00
883577a8-c46e-4304-b779-e2939655bb6c	66698ec4-f6af-46e2-853d-c0222e93d254	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:57:56.022171+00
a14c9ad2-7a6b-4d51-8b5a-c7a941e5e960	557bf093-b007-481e-971e-3a4b706931a2	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:58:12.075016+00
fd368734-df5e-4840-8aef-96aaeec09919	ee7c0f09-a510-46f8-8ed6-2c6a4f573bd7	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:58:35.105413+00
607e81ba-f033-4b47-a1b1-5f58237fdf2a	c3f60323-64e8-4b33-b79c-da30cabc3c35	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:58:56.35963+00
5c0fc0f4-4e3e-43fb-ab26-b0556e7eb37a	5f7ce71e-4249-4866-9ce3-93326c782d95	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:59:46.477351+00
64258f75-5494-4e6a-af56-dfc338b67112	39b93a71-05f8-4a1b-8bbc-cee9efb741c3	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 14:00:01.891265+00
c6de33af-f2cf-4e7d-97df-e024da85e835	9b022edf-bf6e-4998-a274-cb2c4bcfce11	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:59:10.42694+00
ed5355ae-ad53-405e-a20c-ae40515816d5	734aa037-c856-4eb2-8675-406adf95756f	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 13:59:29.511896+00
aaddc95e-f32d-4bb6-9ae5-93e5eb9b47a4	09f83fa4-398c-4790-90e6-c29b971d3d64	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 14:44:41.975197+00
d164221d-a1cd-4afb-8ab6-9e7e7553e857	271fca9c-4dab-43a3-bc9b-fcb35382d2e5	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 14:44:53.978707+00
9741d150-f3e5-4b92-8891-2750f6c04b6d	c0293ab4-2aaf-4219-8453-c25be44557b7	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 14:45:06.867633+00
8614791c-1b39-44c4-9a1e-b88408a4e2c4	f536633f-bf77-4edc-ab47-47e8eb59633b	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 14:45:25.559251+00
f64f4815-da64-4600-9f62-61691d103cba	2ad7c4ef-c12e-4aa9-8228-170548c99296	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 14:46:01.665252+00
04953225-d614-4138-af3f-de2a8b4f5e6e	eccac48a-1117-4fa7-aa08-52484365df3f	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 14:46:12.661806+00
983662ce-246a-4967-970c-c952701ddec2	fe1fb09e-1aff-4253-b2c9-a239357cede2	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 14:46:24.469385+00
3babb804-563e-4f46-a349-a68a0d988018	a0aa320c-d24c-4499-9d17-edfcd5829d9d	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 14:46:41.241484+00
75465813-1976-4605-90fe-a71b8dd7f0d8	ea086951-8124-45ca-b635-006ca7da4841	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 14:46:56.813169+00
81c1d871-65d2-458f-a5d1-6a6b9fafc725	4e7f5f86-3f93-4da2-8959-3e7beb8cf198	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 14:47:10.835817+00
41798e77-8990-4015-957d-33b528ab5463	6f90425b-bd58-4538-8c57-add16f785187	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 14:47:29.248854+00
39858e79-933f-4f85-b9f0-03c593ad42a7	50cb1b34-efc4-487d-874b-4506181b2f66	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 14:48:14.781173+00
c55fe872-5599-480f-9956-099c01407925	bc85920f-fd7d-4151-9d24-03f73cd3ea7d	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 14:48:26.53951+00
13467cce-88a0-49b8-afcb-c055ce92619d	22ba8246-efea-4d75-8b8d-bee18f0b09df	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 14:48:37.73277+00
f2282cfa-d6a9-4a2f-a2b9-34cf52178554	48a40fed-2aa7-42a5-8242-f1faeb8a3ef1	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 14:48:53.29769+00
1b87021c-2855-45cb-9351-dbb9c3b2fb9c	2363e99e-cc42-459a-947d-43da12dfe9e0	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 14:49:19.176082+00
700afcd9-787a-48a6-af5f-75f2ec4666bb	016ff391-0e8f-406c-af8b-ee25874e8c03	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 14:49:31.189704+00
53461ba7-875d-4bb1-b061-59234603679b	ebfe3306-0111-4f5a-bc46-99e8d81f865e	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 14:49:42.497576+00
a0a01ff3-4e12-4d6b-b1ce-c79274261458	b016ed6e-c21b-42ef-afd2-212880b48438	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 14:50:00.141739+00
d03ddac4-39b7-4008-8b72-9ae66e445981	d1709e12-08e4-42d4-80b7-9360901d9727	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 14:50:19.622766+00
db06d547-9a1b-475b-a5b3-2f15573aae0d	1d027e1a-6ee8-4fbd-9f1d-2bc17640dbe0	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 14:50:43.964366+00
3d6b54c3-8612-4cf7-8327-bef9adbeb683	c936afd5-3bb3-4d95-b428-fcf1feab2794	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 14:51:02.652295+00
d92b406e-e50b-4aeb-99f5-7c0220654031	c27b8a9f-02cf-407f-b6af-64f1003df37e	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 14:51:15.848971+00
19c5939c-ed1e-4298-9627-a2132922aba5	d66eb892-e7ba-4ee9-ba9f-320cc8f3e2b9	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 14:51:30.703355+00
1f2bb050-e5ed-466a-986c-95d869a44596	0d303b73-c21f-4310-bb56-acc1834a54c5	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 15:07:50.038766+00
145813d5-0c4a-4c8e-be06-7366578de3d0	7b4a91ce-77c3-4c64-b2a8-5d3333e676ad	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 15:08:05.469816+00
dabd7da0-2078-4669-b58d-d01a490e881b	e5ea7b08-c3ad-498b-8990-270fcaa71740	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el título	\N	2026-04-28 15:26:01.226743+00
aa892bcd-1fe8-45ae-bd64-0223ea1b1f33	f536633f-bf77-4edc-ab47-47e8eb59633b	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-04-28 15:34:48.615016+00
552d972a-3c7c-43aa-989a-9d5274be2e3c	c0293ab4-2aaf-4219-8453-c25be44557b7	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-04-28 15:34:49.707102+00
a206776f-c7b0-466e-966f-652747da092e	271fca9c-4dab-43a3-bc9b-fcb35382d2e5	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-04-28 15:35:00.366218+00
8c78cc24-cb32-46ce-a5c2-b50b89c81c76	09f83fa4-398c-4790-90e6-c29b971d3d64	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-04-28 15:35:01.607172+00
8b4c965f-2990-4f3e-9cf3-446f0f27bc0a	f536633f-bf77-4edc-ab47-47e8eb59633b	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "en_progreso"	\N	2026-04-28 15:36:21.713919+00
1132451e-525d-4a09-bcd8-d5cba459f7d6	c0293ab4-2aaf-4219-8453-c25be44557b7	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "en_progreso"	\N	2026-04-28 15:36:23.877067+00
23fb63ed-a354-4b92-845e-ff98bf2314ad	271fca9c-4dab-43a3-bc9b-fcb35382d2e5	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "en_progreso"	\N	2026-04-28 15:36:24.854982+00
c02afc4b-0521-4cbd-a443-a88ac93f3748	09f83fa4-398c-4790-90e6-c29b971d3d64	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "en_progreso"	\N	2026-04-28 15:36:25.624989+00
4a56f8a3-96b6-4bcc-b9b0-879915a9da4a	f536633f-bf77-4edc-ab47-47e8eb59633b	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	asignó una épica	\N	2026-04-28 15:36:44.92595+00
192ea8b7-2171-42a1-8efc-898a73455217	f536633f-bf77-4edc-ab47-47e8eb59633b	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	asignó una épica	\N	2026-04-28 15:42:57.227826+00
194cebfc-b2d7-41af-bd56-17b19fefe341	f536633f-bf77-4edc-ab47-47e8eb59633b	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	asignó una épica	\N	2026-04-28 15:43:00.716907+00
32c336c8-a7d2-4a31-99c9-fd6d72025762	d4af2f33-4b7d-4419-9b2b-c5f42b3024a6	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-04-28 16:16:07.804593+00
642ea4dc-a511-4891-b96d-d9c53d7d6280	0d59c073-d693-43ca-a514-8617a1efcccc	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	actualizó la descripción	\N	2026-04-28 16:29:02.548935+00
1e48ee8a-ea9c-44f9-9b34-359830e9e53a	7d4f73a1-5a66-4296-af9c-1a46e7f588a3	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	actualizó la descripción	\N	2026-04-28 16:42:54.801916+00
9803148f-dcec-47b5-b15d-6badde6afb97	7d4f73a1-5a66-4296-af9c-1a46e7f588a3	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la prioridad a "urgente"	\N	2026-04-28 16:43:09.0591+00
392323b0-776c-45e4-9400-049cebf2d863	0bd0013c-8e91-47c9-974f-1ccb62629f18	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 17:15:05.300254+00
b563c369-2522-414d-bd12-8db9c5d43a27	0bd0013c-8e91-47c9-974f-1ccb62629f18	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 17:15:11.048591+00
603b21c3-6653-4db7-b4c9-365e276ac049	9655a268-f283-47b8-b9ee-c302540cae97	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 17:15:21.853065+00
c38d41ab-4365-4ed9-b795-381fc4fe0842	9655a268-f283-47b8-b9ee-c302540cae97	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 17:15:27.786464+00
4133d911-82c1-47df-8dcc-05f8ee42c4ce	9655a268-f283-47b8-b9ee-c302540cae97	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 17:15:29.391025+00
65e7610d-b7a2-4fe0-88fa-c854eff94864	9655a268-f283-47b8-b9ee-c302540cae97	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 17:15:34.537663+00
fd63ea80-07de-4cb1-8823-2064e7af9c56	a276f31d-bd9b-4442-868a-b858d34fce92	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 17:15:59.921599+00
255f634a-2be8-42f5-a0cf-1a5e90f2335d	a276f31d-bd9b-4442-868a-b858d34fce92	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 17:16:07.141053+00
a7152be7-29f0-4f43-afdb-33447fcf049f	bc7763b6-5fc0-4690-8975-b554d9d8fe2c	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 17:16:22.220564+00
1c53f460-6936-4413-a91e-0e4d3ee33497	bc7763b6-5fc0-4690-8975-b554d9d8fe2c	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 17:16:24.921491+00
c4fcd79c-b3c6-4440-8f21-5ea4e1c3a20a	7b9e0a9a-4ba5-459c-80fe-55c90bc1f96e	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 17:16:45.693409+00
f5cf84d0-a9af-4c3b-a193-d865ecb6e50d	7b9e0a9a-4ba5-459c-80fe-55c90bc1f96e	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 17:16:48.255572+00
805dd2be-32aa-4de8-bfb5-b13da273a6e1	2e6006fc-2e37-4a77-a78c-91acb2a7b837	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 17:17:04.201211+00
9661428b-81fb-447d-b264-08001522b450	2e6006fc-2e37-4a77-a78c-91acb2a7b837	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 17:17:06.118563+00
add05e76-5010-4883-a591-cdc976d19164	53dca069-7858-4ba5-980b-bec5298926e7	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 17:17:20.737474+00
e63bb546-1768-4b33-89d7-8fbcd81df4c8	53dca069-7858-4ba5-980b-bec5298926e7	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 17:17:22.739167+00
e7d6e58c-5eb6-487b-80be-7d5144a12583	c04effd9-26c4-492f-a79b-494abb7f477f	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 17:17:36.662264+00
57d44edb-03e2-4604-aced-1cde1bff4e21	c04effd9-26c4-492f-a79b-494abb7f477f	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 17:17:38.940278+00
7a3dd313-cd84-4ff4-a9c2-ab6e9e1f76df	880a132d-10eb-46b0-9235-c506fa2740fe	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 17:17:55.958594+00
7860346f-83ac-472d-b5a8-ca1ed6317367	880a132d-10eb-46b0-9235-c506fa2740fe	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-28 17:17:58.171194+00
012dac14-82f1-4dc3-a93d-dd4a16fd32eb	46557d15-3e24-4848-8106-c5cf1ecf923b	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó una épica	\N	2026-04-28 17:25:19.744613+00
d18b76f8-4b92-413c-a450-608f0289c97a	4b7ea4fa-e6d3-4633-8d45-fb192cf7d72a	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	actualizó la descripción	\N	2026-04-28 17:27:30.647051+00
95461127-e440-4231-bce6-68e9cbbaec12	8e0cd0eb-cb35-44fd-86c1-36aac69a7ed9	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	actualizó la descripción	\N	2026-04-28 17:29:39.047521+00
102c0570-1029-4484-bdb3-c58fccfc7136	0a04975c-a695-475e-86c7-915326d5c321	\N	a4724453-124c-45a3-a8c5-db01560300cc	cambió el estado a "completada"	\N	2026-04-28 21:59:41.186834+00
6a743ee3-a8c3-4432-a58f-5af35f1bdc81	f52d28ea-48f4-4e51-8410-2d17e0bf3d51	\N	a4724453-124c-45a3-a8c5-db01560300cc	cambió el estado a "completada"	\N	2026-04-28 21:59:42.826813+00
aba1c8a3-4848-46ea-8390-6b23eb37e1b8	e5ea7b08-c3ad-498b-8990-270fcaa71740	\N	a4724453-124c-45a3-a8c5-db01560300cc	cambió el estado a "completada"	\N	2026-04-28 21:59:46.998219+00
a931811d-9c34-4ca8-8a1a-602370b3e041	271fca9c-4dab-43a3-bc9b-fcb35382d2e5	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el título	\N	2026-04-29 00:24:51.18964+00
90e2d520-cdd6-4605-937f-cf71f07dbf7d	09f83fa4-398c-4790-90e6-c29b971d3d64	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-04-29 07:18:51.028357+00
ec674e34-97b0-4c91-b0f5-fdf309780c29	f536633f-bf77-4edc-ab47-47e8eb59633b	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-04-29 07:18:59.275322+00
ad87a09b-40f4-4671-8daf-1ffb2dd04e71	271fca9c-4dab-43a3-bc9b-fcb35382d2e5	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-04-29 07:19:01.610832+00
e18cc7f1-82f2-45a8-8a4e-8c0581851362	c0293ab4-2aaf-4219-8453-c25be44557b7	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-04-29 07:19:03.516317+00
1d7ac015-970f-4a3b-bdd6-5417edf5a687	6b0b5be3-b8ea-4858-8914-0a3e9720d67d	\N	a4724453-124c-45a3-a8c5-db01560300cc	asignó la tarea	\N	2026-04-29 23:03:22.832607+00
986c2f29-0537-4f8d-a5ed-a83f98266b6d	0346c89d-ca4b-44e0-904f-f88f7130cf4d	\N	a4724453-124c-45a3-a8c5-db01560300cc	asignó la tarea	\N	2026-04-29 23:03:44.173128+00
a61b7e41-8b7a-4578-a222-6c3e3b8dccdf	5f2b9e1d-dd05-44f7-ac04-193e1ff129b7	\N	a4724453-124c-45a3-a8c5-db01560300cc	asignó la tarea	\N	2026-04-29 23:08:52.493281+00
f1c2d096-4564-44f1-82a0-a911670e1ad4	cc1d4bb2-c12b-4b62-b076-bcdabcd8c42a	\N	a4724453-124c-45a3-a8c5-db01560300cc	asignó la tarea	\N	2026-04-29 23:10:02.167247+00
26fb210c-30c9-4ea4-bf1b-190d872fbbf4	4e2e4bde-9ff4-41e9-8b96-402b95bd87ed	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "backlog"	\N	2026-04-29 23:31:36.279781+00
48bb8e7f-3bcf-4f35-acf0-3d73196a6db6	4e2e4bde-9ff4-41e9-8b96-402b95bd87ed	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-04-29 23:48:32.75927+00
dc37907e-e828-4b64-88a3-f0c55477c93f	50cb1b34-efc4-487d-874b-4506181b2f66	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 13:42:09.522247+00
75cf32f1-f8e7-47a1-99d1-462c87e3b1ae	bc85920f-fd7d-4151-9d24-03f73cd3ea7d	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 13:42:24.863516+00
c453cde5-2368-4fc4-83da-6cd459b64fe1	22ba8246-efea-4d75-8b8d-bee18f0b09df	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 13:42:37.651415+00
026717c5-7aef-43dd-bba9-a1ee66ff6ac1	48a40fed-2aa7-42a5-8242-f1faeb8a3ef1	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 13:42:57.466953+00
be2cfaa3-bf33-4e92-8d20-dbd173905b25	2363e99e-cc42-459a-947d-43da12dfe9e0	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 13:43:09.906513+00
1652d5a5-3702-4018-8aee-431c65642bb5	016ff391-0e8f-406c-af8b-ee25874e8c03	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 13:43:22.459669+00
1516c1df-85b6-4c41-8e87-ee73cc1b4957	ebfe3306-0111-4f5a-bc46-99e8d81f865e	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 13:43:36.456233+00
0e905014-fd4e-4ddc-b191-16de0dd6195f	b016ed6e-c21b-42ef-afd2-212880b48438	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 13:43:51.712305+00
a245142b-70d0-4004-8a23-fb5284c25159	d1709e12-08e4-42d4-80b7-9360901d9727	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 13:44:06.945873+00
85a42acf-1d68-4cbc-8749-1480ed38db68	1d027e1a-6ee8-4fbd-9f1d-2bc17640dbe0	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 13:44:22.028586+00
3fd4932b-502a-488e-a904-3af95518be9b	c936afd5-3bb3-4d95-b428-fcf1feab2794	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 13:44:37.49781+00
5b353bc9-9303-42fb-8f71-bf7708ce5331	c27b8a9f-02cf-407f-b6af-64f1003df37e	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 13:44:51.997171+00
d75863fb-0693-4d93-9b0b-af3c3f8d4ed4	d66eb892-e7ba-4ee9-ba9f-320cc8f3e2b9	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 13:45:06.587765+00
a8c3b98f-b03c-4cc0-ba7e-72c3d9b65459	0d303b73-c21f-4310-bb56-acc1834a54c5	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 13:45:25.426393+00
357962c1-be7a-44df-ad4b-7423c3ca34cc	7b4a91ce-77c3-4c64-b2a8-5d3333e676ad	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 13:45:37.323723+00
5ac20e6f-7e4f-4c0c-be5d-a227b445ea97	89fc652a-b901-4c19-aed8-f3d3847dbcfc	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 13:50:50.792269+00
744238a9-c53a-4604-980e-55e39b59d061	89b6ad41-7fa5-4a1e-b8f8-ff22b955463c	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 13:51:02.863761+00
9f8d9b3e-ad7c-4011-aafc-6fc095c31ef3	f9d006e4-72e5-4fa9-93bf-a91e955c23e7	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 13:51:13.201311+00
75171f65-8c47-4f57-9c18-d75dbe48fe52	cba8d8b5-18e9-4fda-a893-67748a81d2e4	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 13:51:26.272193+00
bcc05341-89ce-476b-8960-378bd1593145	151bcd2f-3d0a-4526-ba83-bd7b84110c26	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 13:51:38.074593+00
7f635b6b-7f91-44a7-bbcc-559be7982d44	26999ab0-81a0-4936-a108-287577640277	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 13:51:49.877113+00
a256471f-d1a5-46c6-871b-8cc60696fabd	6a305c83-3738-4540-b650-5456c87ed78d	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 13:52:02.279295+00
e720574c-7579-4da9-ba2b-ced02ae74ea6	3e224159-350b-44ee-ac8c-ecf21471ba86	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 13:52:17.785376+00
26848280-9bcf-43aa-bf3c-31020fb4d0ac	eb048489-cd67-4542-aaf5-d9c191de2418	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 13:52:31.44437+00
e89771c0-87fd-4f49-ad6a-8d42a57f4f7c	e340ebfa-8cdc-4802-b305-c0bc390a6f03	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 13:52:44.553335+00
1b8b5dd0-b453-4fda-bc2b-33dc97b9bb46	2bb4847d-dd46-40a2-9904-35390fffa4b5	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 13:53:00.247669+00
9b65730e-caa4-428b-82bf-0c7ec486421f	f03d7be9-5ec1-47df-99e2-6f193b99d3cb	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 13:53:18.979768+00
1fd4789b-418e-4693-af74-f4489dbc7329	766e1969-2c5e-4f3a-b528-8bd9d439fa6a	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 13:53:37.187023+00
5c2432fd-f3de-4882-a67a-2b6a03243c1e	9db77372-aca8-4b4f-a96e-7695dfb8b385	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 13:53:52.904469+00
8238715c-b00c-482f-bca6-caa2fde0797f	1c72e3ab-9e3f-42ea-a1fc-e50c75205d68	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 13:54:08.996136+00
25d9a573-8ced-4b07-865a-508b93aac2f6	08a31b11-d2a5-4344-8b0b-942378925686	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 13:54:26.400504+00
87572474-64f7-4163-805c-ac2f92c91171	7df852e8-5da4-467b-8abd-d76af283551d	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 13:54:43.637438+00
af0dffa4-28ce-4965-bcf0-796804b762d6	6191c709-0f13-42d0-b69b-7d5dea237a15	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 13:54:55.895576+00
ddcad252-0315-4116-9359-912fea84bad1	94d2a2d3-3dbb-42fb-a6bf-b7521a64b79e	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 13:55:08.783019+00
a27f801f-c8cb-4079-842e-5c657992f443	99eda663-28e8-47a8-907e-6504640bf583	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 13:55:22.427704+00
4545d89a-6107-4b50-9faf-e1532260ce74	fc7fdf98-068a-4ce8-a895-a43f52f693a8	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 13:55:36.641865+00
8fec57d3-43f1-40c9-9f73-b7fb21b43351	0e85266e-b070-4f9f-8988-b698596ff466	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 13:55:48.387472+00
d42412d6-df87-420e-9b68-1a97a05ecd4a	7d4f73a1-5a66-4296-af9c-1a46e7f588a3	\N	a4724453-124c-45a3-a8c5-db01560300cc	cambió el estado a "completada"	\N	2026-04-30 14:16:10.757006+00
fe887691-8ff7-476f-94f3-fa13945d5dd9	beb52a27-90ef-4af9-9761-fa44cf3c9ac8	\N	a4724453-124c-45a3-a8c5-db01560300cc	cambió el estado a "completada"	\N	2026-04-30 14:16:33.676015+00
a15e5308-90fb-43d3-97c5-02687a03892c	1aed1bc6-6adb-4fbf-9531-d9bde0abdc70	\N	a4724453-124c-45a3-a8c5-db01560300cc	cambió el estado a "en_revision"	\N	2026-04-30 14:44:50.228409+00
58edca04-2b0f-41ff-97db-e558145d154e	663b015c-0a25-44f9-bf5f-c47c9e216968	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 15:25:41.170135+00
78fa513e-0700-4654-8817-aeea55ca40b9	663b015c-0a25-44f9-bf5f-c47c9e216968	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 15:25:54.827043+00
8d97a491-62db-4fa7-aee3-e131da6ca732	663b015c-0a25-44f9-bf5f-c47c9e216968	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 15:26:48.034652+00
fd87a94e-ec30-4511-bdc4-6f5596e0b3af	663b015c-0a25-44f9-bf5f-c47c9e216968	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-04-30 15:26:59.636903+00
d643f5bd-ed45-4956-baa8-5c78ae72efbc	663b015c-0a25-44f9-bf5f-c47c9e216968	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-30 15:27:28.044532+00
c5be5d4f-93fe-46c5-862b-0314dfcccd3f	663b015c-0a25-44f9-bf5f-c47c9e216968	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-04-30 15:27:37.786661+00
cf877d62-c3ed-4bca-93ef-b4596fe9f426	beb52a27-90ef-4af9-9761-fa44cf3c9ac8	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "en_revision"	\N	2026-04-30 15:30:29.163112+00
fd8ad6d5-9314-48e1-888c-c8419af72283	dc04cf85-16c7-4a6e-914d-62ca34465ee9	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	actualizó la descripción	\N	2026-04-30 16:14:36.501905+00
ff6fae04-5984-40d1-8169-9184185357a6	dc04cf85-16c7-4a6e-914d-62ca34465ee9	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó una épica	\N	2026-04-30 16:14:42.814496+00
dfc17d09-9161-45d7-a2b5-e4832a806dd1	32c61311-2fdc-4d7c-92c8-b898eca6e50b	\N	a4724453-124c-45a3-a8c5-db01560300cc	cambió el título	\N	2026-04-30 16:16:22.069649+00
96d655a3-c74f-497f-ae60-4c46d4b79410	32c61311-2fdc-4d7c-92c8-b898eca6e50b	\N	a4724453-124c-45a3-a8c5-db01560300cc	cambió el estado a "completada"	\N	2026-04-30 16:16:34.273446+00
03aa3734-de2f-4a58-af33-c404cfee9492	32c61311-2fdc-4d7c-92c8-b898eca6e50b	\N	a4724453-124c-45a3-a8c5-db01560300cc	comentó en la tarea	\N	2026-04-30 16:16:50.021312+00
42d6a18f-a9ec-490c-b5e8-e4944f979bc2	32c61311-2fdc-4d7c-92c8-b898eca6e50b	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-04-30 16:16:50.531121+00
067f5659-53a8-4ff7-afb1-e27ec6f00b53	b0d57da4-0ebc-4a2c-ae5f-28b71e770f75	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó una épica	\N	2026-04-30 16:21:39.37386+00
b5607783-5264-4781-864f-b325d8fb18e0	1aed1bc6-6adb-4fbf-9531-d9bde0abdc70	\N	a4724453-124c-45a3-a8c5-db01560300cc	cambió el estado a "completada"	\N	2026-04-30 17:57:53.402244+00
371e603b-2116-49ef-9981-4103537630e1	0d59c073-d693-43ca-a514-8617a1efcccc	\N	a4724453-124c-45a3-a8c5-db01560300cc	cambió el estado a "completada"	\N	2026-04-30 17:58:06.205112+00
3914515b-c650-4cda-9e51-3a9cacb68d15	3aad96d9-b9a3-4cdd-b005-5324817e53ba	\N	a4724453-124c-45a3-a8c5-db01560300cc	cambió el estado a "completada"	\N	2026-04-30 17:58:10.104173+00
e728185e-648e-4a6d-8983-049e32d4a43a	5ce47d36-19a0-40cd-9dc3-7f342f3e8593	\N	a4724453-124c-45a3-a8c5-db01560300cc	cambió el estado a "bloqueado"	\N	2026-04-30 17:58:32.81299+00
e9b0d135-c2d6-4515-83d9-8c0693a5b95c	5ce47d36-19a0-40cd-9dc3-7f342f3e8593	\N	a4724453-124c-45a3-a8c5-db01560300cc	comentó en la tarea	\N	2026-04-30 17:58:56.360328+00
1ab5fa82-9716-48c4-9b2d-0ab0ccba64b3	4d449a88-ee07-4c75-b18d-3d4bb6093917	\N	a4724453-124c-45a3-a8c5-db01560300cc	cambió el estado a "en_revision"	\N	2026-04-30 18:50:37.359725+00
d2936048-480e-491a-9471-b5827c1de34b	663b015c-0a25-44f9-bf5f-c47c9e216968	\N	a4724453-124c-45a3-a8c5-db01560300cc	asignó la tarea	\N	2026-04-30 22:16:48.277326+00
897a06f4-98f3-4f0d-a463-062a0b0bda46	8eba31f9-aea0-4f13-a14d-3267f7e3c839	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-05-01 16:10:26.093755+00
7d87fd3e-e7ff-455d-adbc-48330d4395d7	71219edf-b294-40b5-9a9d-aef242f0d311	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	comentó en la tarea	\N	2026-05-01 16:15:58.640014+00
e4d106ea-ca04-4f30-bcb1-74018ec05d87	c321378a-a64c-4d29-9db8-3bd8eb5e0557	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	comentó en la tarea	\N	2026-05-01 16:17:00.686957+00
90f66b58-8cb2-4326-b258-c32ecfe7dbfa	fe502370-1edd-4952-b738-49fcc8d13fd2	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	comentó en la tarea	\N	2026-05-01 16:17:12.673909+00
13075cb5-5884-44cb-b785-8a9be8083d08	71219edf-b294-40b5-9a9d-aef242f0d311	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-05-01 16:17:23.683548+00
a659a17c-112f-42a4-9441-4eb1fc23703a	c321378a-a64c-4d29-9db8-3bd8eb5e0557	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-05-01 16:17:25.739838+00
e406c986-ecc6-4fe5-b7ba-eb93b44aa3d6	fe502370-1edd-4952-b738-49fcc8d13fd2	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-05-01 16:17:27.543077+00
48a61251-8bef-42e8-a3aa-bc6b84c06a50	fdbb9320-9c81-4001-bbec-abe5e3db9b19	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el título	\N	2026-05-01 16:25:03.183687+00
4ca5747b-e537-4b49-806e-bf85a6c70a10	c6f78185-b2e7-4a70-9dca-aa3a8f91f72f	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-05-01 16:25:48.588371+00
ca2ce941-23f2-451a-994c-46180ae6321b	fdbb9320-9c81-4001-bbec-abe5e3db9b19	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el título	\N	2026-05-01 16:26:11.251355+00
480ed7b1-742f-48b7-958c-5abd5798ac5f	ddea503b-ed03-4b35-8e48-22f4d56c9f99	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:11:20.404014+00
313b44bc-79cb-41d8-a990-966b0a63ba26	0f50d98f-7899-44f9-8499-52b18359a064	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:11:27.200053+00
fb74acac-dd8f-47ad-90cb-d72b07c85419	d4b44294-cd00-4e76-89af-fc645e655ea2	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:11:32.29817+00
f8160957-9e2d-43eb-be1f-5cf5e0946383	441e3fb9-915d-4ba6-895e-d753dc2d5e27	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:11:45.436156+00
dfca2294-96ce-4df2-94f9-1bd8df00a9af	d7b66a93-eea2-4a64-b321-59763a3f58e4	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:11:54.389598+00
147bef7c-e040-4a87-9bd0-fcf4a5f2049a	5e35e541-fc56-4942-96f0-e051205b6daf	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:12:04.225287+00
e495e4c6-161e-410a-99c1-81076329c375	4d2810d7-ea9f-49d9-8ec5-5bdb9643300a	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:12:11.048986+00
ce739e0a-a465-45fc-94d3-2c21d2b7d6cd	9ced7970-249a-45af-a014-bc22a05d1b3d	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-05-01 17:30:44.043283+00
79595056-d7af-4664-8bfb-8b6fbbea540f	c3f60323-64e8-4b33-b79c-da30cabc3c35	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-05-03 16:56:19.597199+00
c7b150de-fdae-44a6-9589-c8a4db4a089d	9b022edf-bf6e-4998-a274-cb2c4bcfce11	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-05-03 16:56:29.475242+00
fedd0f6b-5239-4711-98cc-1be008408578	734aa037-c856-4eb2-8675-406adf95756f	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-05-03 16:56:40.193561+00
14edd4af-c6ee-4190-857c-af60d86bd610	ea086951-8124-45ca-b635-006ca7da4841	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-05-03 18:43:26.213942+00
f3666325-1995-4757-8149-2b69fd9ef954	b016ed6e-c21b-42ef-afd2-212880b48438	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-05-04 22:43:53.592452+00
4912abd8-814d-4239-8a0c-5c98f74ba456	c936afd5-3bb3-4d95-b428-fcf1feab2794	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-05-04 23:44:59.660623+00
a428221b-2bdf-404b-b999-20b0cc69ef34	bc85920f-fd7d-4151-9d24-03f73cd3ea7d	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-05-05 00:19:57.957427+00
0185eaa6-ec73-43b7-ac22-0497b945837f	b0d57da4-0ebc-4a2c-ae5f-28b71e770f75	\N	a4724453-124c-45a3-a8c5-db01560300cc	asignó la tarea	\N	2026-04-30 18:52:01.163459+00
5e68d145-0bd1-437f-8cea-2739d172e9ef	f284362f-bc41-49db-9831-6c4da7af4d2b	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el título	\N	2026-04-30 22:29:23.254578+00
3fe7b175-2903-4999-ae6f-3aaa90c71e53	f284362f-bc41-49db-9831-6c4da7af4d2b	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el título	\N	2026-04-30 22:29:41.836784+00
6a22446f-696a-4a05-b4bb-c241636671d8	50c0fa37-dfed-4f0a-b874-73d62c44dfeb	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-04-30 22:30:41.565788+00
afdb2f13-783a-40d8-8d22-029df23ec204	6c1a4842-e874-4bcb-a6d7-78ea99cc92fe	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-05-01 16:11:53.028339+00
3cd3b38f-3aaf-40e4-b196-9fc22c5aaa3b	9c786d70-f5be-4d69-baef-6140b137e815	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-05-01 16:17:56.745117+00
89c9c8d1-9ffc-435b-b51d-6da8ec813671	b0d57da4-0ebc-4a2c-ae5f-28b71e770f75	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-05-01 16:17:59.335082+00
30b869a3-ff97-4855-9679-0b7ab71a59d8	9f3e7988-1f5a-438e-b2bb-48f29b06ce6f	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-05-01 16:18:01.846876+00
fabc72b9-2172-4001-a2bd-1a6f718f7a9f	57ed36fb-85a5-4d05-81f3-b4dc2e01599b	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-05-01 16:18:04.919437+00
ee1cdfb3-3647-4ad1-a77b-346216a1986e	4a916651-ab17-4eae-b24f-f6aeb2be3e39	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-05-01 16:18:07.919364+00
0d9a4d62-b242-4409-9e6c-a995360e2d06	57866bd8-f3ca-4747-987c-0c19571f540e	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-05-01 16:18:10.575217+00
e2fe08c4-1a7b-4afa-bd09-24fc28b6925b	7852e7ae-9ca7-4df6-a549-5ac6272ea334	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	comentó en la tarea	\N	2026-05-01 17:04:43.317392+00
9b3edc71-23de-4819-9ade-4faccf4da11c	5f2b9e1d-dd05-44f7-ac04-193e1ff129b7	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-05-01 17:13:01.470536+00
fb41d301-a465-4338-bb13-a02dc154a1dc	eec4e210-84c3-49a9-a680-827f8da5600a	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:13:16.528485+00
b983fdd7-3027-41c0-8a3b-748581c8739b	f3859a7b-132d-4328-9dbd-99d6232f5498	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:13:22.621318+00
e7e02483-0afb-42a4-a19c-40019912bae9	33ea391c-23a5-4dd0-a05a-adc18e034b00	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:13:27.98188+00
70ee9369-8dbb-416a-bbc7-b1df54931705	663b015c-0a25-44f9-bf5f-c47c9e216968	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:13:36.37148+00
f6dd5e70-4b5b-4664-bfd5-57771d705cba	ba9c51de-b85d-46ff-b836-678e4e9df285	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:13:41.776671+00
91e4e006-426b-4c15-8557-70fec7e05518	e3d6bbdc-5504-4ac7-b552-ad5e2b19ac10	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:13:46.762747+00
52a57602-c6ad-498b-9145-99900c890599	12f9c9b7-8ac6-47d6-8ed6-692aac79ed2b	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-05-02 00:38:08.249423+00
1d604af3-a5a4-430b-842d-e7d26f3c62db	66698ec4-f6af-46e2-853d-c0222e93d254	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-05-02 00:38:19.476049+00
35b92045-48f3-438f-99f1-4c539f863f71	11d4da69-d496-4c61-8296-09faf5031dcd	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-05-02 00:38:27.439799+00
9c0c9e9f-fa85-46e3-bb8a-5773541b61c4	5f7ce71e-4249-4866-9ce3-93326c782d95	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-05-03 18:23:07.169739+00
5fdb90de-bb5c-49f1-93f3-92ef854ae62d	4e7f5f86-3f93-4da2-8959-3e7beb8cf198	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-05-03 18:47:34.266337+00
916dafca-4459-4500-8f79-1c0e0cfc5a3e	d1709e12-08e4-42d4-80b7-9360901d9727	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-05-04 22:44:38.863454+00
791c88cb-0c57-45b6-9982-68563ae9dcf7	c27b8a9f-02cf-407f-b6af-64f1003df37e	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-05-04 23:46:03.989892+00
d5bf579f-6856-42a2-8cbf-f0de3dc19604	22ba8246-efea-4d75-8b8d-bee18f0b09df	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-05-05 00:28:11.866874+00
8ed0f8fc-c1f0-4d9d-b758-9ee6d061ef29	beb52a27-90ef-4af9-9761-fa44cf3c9ac8	\N	a4724453-124c-45a3-a8c5-db01560300cc	cambió el estado a "completada"	\N	2026-04-30 18:53:34.754275+00
a2d848e6-5850-4cf7-9980-adf3d51dc97a	7e3e056a-f2f8-4714-8ed0-9b20b2a3d4f1	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-05-01 00:39:45.024383+00
fc4c83b2-8214-4921-b007-383c3fd53819	53b3b2c3-76b9-45f1-be9d-c59237409a8a	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-05-01 16:11:59.666224+00
c67a04d4-a29a-43c8-ae10-2653b20ac554	de9b2e3e-788e-485f-bb54-67880a1aec03	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	comentó en la tarea	\N	2026-05-01 16:18:51.075179+00
49d5a045-f977-48a5-b57b-9824e5de394d	de9b2e3e-788e-485f-bb54-67880a1aec03	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-05-01 16:19:03.007884+00
d38f195b-d77a-41ca-aefa-be14e5ce83f9	cc1d4bb2-c12b-4b62-b076-bcdabcd8c42a	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:07:02.875398+00
06e54ee3-a9f8-4a06-b676-f40a257119f1	4f49c550-2875-4327-831f-856868637a45	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:07:10.094012+00
97625577-2362-44db-abcc-6722b3c9964a	6e75f224-76ae-440d-9ee7-c524d4c6d684	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:07:15.613547+00
f701b9d9-0174-4277-9f79-90edde4b1380	0d3f69f1-06d0-4789-836f-08a60a5eaa71	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:07:20.905123+00
604ad9a7-a5cc-4065-8a30-4a1f12639e0f	771eb496-db99-4292-a2f1-143e72273752	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:07:30.190711+00
ad70b3c0-583e-4f9f-b61c-f4d6b194e9bf	938eafe8-3f1c-4fb4-b13e-359a3cfb2631	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:07:38.32406+00
9d81fb87-ff11-42e0-b244-238be7d4842d	e05d31de-db68-42a9-b7c6-25235d714238	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:07:54.697177+00
a7877880-a90d-420d-848b-5c97d946e226	5f2b9e1d-dd05-44f7-ac04-193e1ff129b7	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:08:02.797411+00
947ec8b3-cd54-4122-8c20-55943d0de5f0	277621d2-356b-4641-8b12-e7bcbaf0ead4	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:08:08.088091+00
ad901446-b5f9-4b26-b9a3-4cc6db4b451f	5f6cd8b2-f0b5-4bda-80b3-d69be7af466a	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:08:49.683022+00
5b710a0a-e514-4ba0-a865-9f270e679017	fd2d4f7b-b346-45a3-82da-6f5566d8cc4d	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:08:54.119631+00
c7ee3506-b39d-4f9b-ac02-8b66e3a7eb4c	0804e66d-e55e-4586-9998-b89ad576a0cb	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:13:54.513531+00
6afda344-2047-4500-a47b-97bc54f3e826	5ed450e4-5ccc-4ac4-a703-c5e65c551fd3	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:14:04.187388+00
a4a9dc71-2e2d-4780-854b-e2af0bf3c09d	17b94d21-5d9a-4004-92d3-d46e03e04a0b	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:14:13.400796+00
23a1acc6-fb0d-4ebe-9a21-fbe18f916932	677056b9-beaf-4c0a-a7c1-008c43de299d	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:14:25.224357+00
6acc0ba3-cb8a-4d77-afc9-551b733a4494	85a306ca-d6df-4fb2-9227-e128479d0b68	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:14:34.846998+00
dc707862-b69e-4690-925e-0213bb3e70f4	006890db-0d14-4d77-abdf-743e48dbda1b	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:14:43.071405+00
ba62274b-91c1-4273-a85d-4e0e876d5b39	6825af05-9ac8-4ead-930f-65c661feb7cd	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:14:50.210481+00
0ac184bf-6e68-43fb-85cc-e88489dd4d9f	89fc652a-b901-4c19-aed8-f3d3847dbcfc	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:15:28.589946+00
dcde72d3-6839-4d36-868a-a21982e77f18	89b6ad41-7fa5-4a1e-b8f8-ff22b955463c	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:15:33.468813+00
1dbb64b0-3f80-4cd7-82e8-2bc07f0ee95a	151bcd2f-3d0a-4526-ba83-bd7b84110c26	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:15:51.718201+00
ef9bd559-dbc6-4ee6-8b7a-ed8f79366aeb	26999ab0-81a0-4936-a108-287577640277	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:15:56.571459+00
8eb8cc1d-17b9-46f1-a51d-d764220069fa	e340ebfa-8cdc-4802-b305-c0bc390a6f03	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:16:20.258132+00
4329eda8-cf2d-492f-b796-2f1f852e09fc	2bb4847d-dd46-40a2-9904-35390fffa4b5	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:16:29.5504+00
1a7f0264-c117-426c-a424-dbf52eb2ff23	f03d7be9-5ec1-47df-99e2-6f193b99d3cb	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:16:35.693366+00
07d65911-9e91-4759-90c9-259f34386542	766e1969-2c5e-4f3a-b528-8bd9d439fa6a	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:16:43.464992+00
805798d6-a70b-410e-9dc6-6d312c79a898	9db77372-aca8-4b4f-a96e-7695dfb8b385	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:16:50.039069+00
72ccca0e-e620-4780-aef5-ffcb2acaf76b	1c72e3ab-9e3f-42ea-a1fc-e50c75205d68	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:16:57.481948+00
eae1d9d1-8386-4b67-9fa4-33ded94a7bda	08a31b11-d2a5-4344-8b0b-942378925686	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:17:01.972864+00
6372adce-7df9-46a8-a046-7d625cc295c2	0e85266e-b070-4f9f-8988-b698596ff466	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:17:39.19238+00
1fd377ab-fe17-4365-9bf0-682a2ea035e3	5c2aa768-e9cd-4027-a2de-c5924c076e62	\N	a4724453-124c-45a3-a8c5-db01560300cc	cambió el estado a "en_revision"	\N	2026-05-02 17:07:03.485108+00
dc19660c-46ae-47c6-a9ef-22c3b668c9ea	39b93a71-05f8-4a1b-8bbc-cee9efb741c3	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-05-03 18:25:03.952749+00
d32083f9-2445-4e0c-8792-7d1a518adad9	6f90425b-bd58-4538-8c57-add16f785187	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-05-03 18:50:40.551091+00
9f61a875-9e26-443d-b4c9-d91dbc89914b	1d027e1a-6ee8-4fbd-9f1d-2bc17640dbe0	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-05-04 22:46:08.227172+00
b26fa1c6-252c-40ec-aecf-090b7f24d37b	d66eb892-e7ba-4ee9-ba9f-320cc8f3e2b9	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-05-04 23:47:37.719634+00
29c01fc3-14b0-4f98-ad91-675250976f45	48a40fed-2aa7-42a5-8242-f1faeb8a3ef1	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-05-05 00:31:40.200156+00
19ff1ff0-958a-4c99-b204-29492a5918b2	39e7b44c-eac7-4504-8fe4-26f67e2ed45c	\N	a4724453-124c-45a3-a8c5-db01560300cc	cambió el estado a "en_revision"	\N	2026-04-30 18:54:01.853361+00
c1371946-4459-4722-94bc-725ccf5e9f8c	39e7b44c-eac7-4504-8fe4-26f67e2ed45c	\N	a4724453-124c-45a3-a8c5-db01560300cc	comentó en la tarea	\N	2026-04-30 18:54:18.965738+00
18e03e94-9882-4d22-ba95-dd3296ae90e9	50cb1b34-efc4-487d-874b-4506181b2f66	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-05-01 00:53:58.452506+00
05f9841b-79de-4bec-9914-a953ead2c3f4	eccac48a-1117-4fa7-aa08-52484365df3f	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-05-01 00:54:34.011051+00
27c6638b-1454-4c7c-8ff3-a843eb57b92a	2ad7c4ef-c12e-4aa9-8228-170548c99296	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-05-01 00:54:49.596445+00
36724b77-5f4e-4ee5-9206-2e2fc62b2844	56ac4ab3-6acf-4abc-8712-7efeba22a56e	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-05-01 16:12:04.450111+00
a4cada6f-7c98-4c15-8a08-56ebb845942c	0346c89d-ca4b-44e0-904f-f88f7130cf4d	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-05-01 16:21:21.469982+00
6ee3a849-caab-407a-a050-cde4a55e8eab	7405ab2f-a69f-4f8b-8183-33c7f98c9393	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "en_revision"	\N	2026-05-01 16:21:37.520048+00
96813932-6f71-468d-8118-8d5969e6dfde	7405ab2f-a69f-4f8b-8183-33c7f98c9393	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "en_progreso"	\N	2026-05-01 16:21:41.834214+00
6eb00997-07cb-4c81-9702-cb13e2922b16	cf8ace6b-89d7-4a24-bcac-1f2278a4ca7a	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:08:58.223928+00
d70da155-014b-4b0f-a4c9-1669dbafc15c	714817c0-c2f3-4070-87bb-60e8dcbfc87d	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:09:04.51561+00
c90aa837-eb9f-48fd-a177-c08257b8b7f9	dda8c736-9568-487a-baa2-cc3eca7f38e1	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:09:24.75289+00
ca5cd1f0-7753-471f-9f93-3f6e877df6d8	62f99d8a-071e-4002-bd31-ef1201d78aaf	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:09:29.911402+00
82dbb868-6cf8-4eba-934a-2bc08ffb8d35	7092821f-73b6-4053-a0b1-26b61507d553	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:09:34.056529+00
cc5085bc-7402-47d5-addd-9dc14f57ae04	f9d006e4-72e5-4fa9-93bf-a91e955c23e7	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:15:38.184764+00
d2c9eeaf-b1e0-478c-a114-607461ab4421	cba8d8b5-18e9-4fda-a893-67748a81d2e4	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:15:43.171353+00
06572b4a-fc5b-4372-8d62-50309d794db4	6a305c83-3738-4540-b650-5456c87ed78d	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:16:01.372401+00
81630d63-19e6-4f9b-b8a2-41914f5a016e	3e224159-350b-44ee-ac8c-ecf21471ba86	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:16:10.391315+00
bb7da013-a8e3-494f-b936-2351b87a0dfd	eb048489-cd67-4542-aaf5-d9c191de2418	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:16:15.348752+00
50edc16b-0d72-4ddd-bdda-9a784573abed	557bf093-b007-481e-971e-3a4b706931a2	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-05-03 16:19:56.428772+00
f0ca1a89-5060-4a8d-9cbf-c14543702348	a0aa320c-d24c-4499-9d17-edfcd5829d9d	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-05-03 18:29:26.64833+00
3b35dabb-46cb-405a-86d1-ebd593ded36a	d9d6ce62-8364-46ad-84b5-2ba1f8ba4585	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-05-04 15:21:35.348461+00
031a4fa0-7258-4456-a565-9021d523d43a	2363e99e-cc42-459a-947d-43da12dfe9e0	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-05-04 22:51:18.775427+00
1085b6b9-a333-42ba-84d8-865971e60682	0d303b73-c21f-4310-bb56-acc1834a54c5	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-05-04 23:49:52.259316+00
73ffeb36-5a88-4d90-947e-082e095eec4a	19ff9b1e-c680-4ec9-b9d5-7701ea82bdfd	\N	60ce5ac5-9ee2-427d-98c5-f7ef2ee556f3	cambió el estado a "completada"	\N	2026-05-06 21:50:28.936244+00
e3255f15-1513-4f3b-829d-2234039e9d75	663b015c-0a25-44f9-bf5f-c47c9e216968	\N	a4724453-124c-45a3-a8c5-db01560300cc	cambió la fecha de entrega	\N	2026-04-30 22:16:30.791819+00
d0a86658-c18e-4723-951e-93176bfc0c00	663b015c-0a25-44f9-bf5f-c47c9e216968	\N	a4724453-124c-45a3-a8c5-db01560300cc	cambió la fecha de entrega	\N	2026-04-30 22:16:43.364028+00
540256bc-72be-451d-9aa6-9305c71fd834	663b015c-0a25-44f9-bf5f-c47c9e216968	\N	a4724453-124c-45a3-a8c5-db01560300cc	asignó la tarea	\N	2026-04-30 22:16:46.372704+00
d12a2fc6-7c37-42f8-9fd9-59169897223b	0346c89d-ca4b-44e0-904f-f88f7130cf4d	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó la tarea	\N	2026-05-01 15:46:41.51482+00
1d8bce65-aa5c-423a-9577-c0edc75ea13d	083365e5-d8cf-4d29-8467-15bd8fd63a92	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-05-01 16:12:41.055235+00
f61d4fd0-125f-4310-a4e0-8b4d5a1eaf08	dd2e73d4-fb49-49c7-85fb-fab309a4572e	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-05-01 16:12:43.69241+00
93834427-9f17-4035-962b-9e712e41091d	2529b415-6573-4916-959e-e9448e68ba7a	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-05-01 16:12:50.519645+00
591c84bd-e0d6-4cab-90e1-5bd1b73303a4	e809428d-7639-4805-89eb-aa44062919ee	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-05-01 16:12:54.25227+00
05c92fc3-2c0b-41d4-8b43-a637a9cdc19f	93609532-f511-43cc-9125-331da6b7eb0a	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-05-01 16:12:58.380752+00
ea503cc6-8c7a-4855-806d-bc1ee3df6eaf	05fe4b7a-4072-40f4-8b9d-2f2dbe5afdb3	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-05-01 16:13:02.046633+00
38c25b08-7fab-4f53-8667-16a4dc37b8ee	09746ccd-54fc-4004-85e8-f4cc70e445bb	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-05-01 16:13:05.224471+00
1635c392-5bdd-454f-a7c6-4ab192d306b8	3ea91c2a-2ce2-4a46-8264-9fdb3f9844b6	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-05-01 16:13:08.733309+00
72e029e8-db31-4163-b598-3d8239c33303	1811323d-878b-4af3-8aa2-b92d575781fd	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-05-01 16:13:14.371337+00
5324941e-1664-4202-baa9-3e7054063d0f	f284362f-bc41-49db-9831-6c4da7af4d2b	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-05-01 16:13:17.373682+00
73525ca4-9eae-4e43-a1d8-a547e42adc28	2e42270d-5596-4ef7-9b38-e4dca8500c01	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-05-01 16:13:20.480287+00
9e8f7565-bc1f-45bf-af6f-13ef164dad1d	d5cd5893-6bcf-4d39-9f44-131fcec88d8b	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-05-01 16:13:23.699832+00
eb88fb31-b382-4a98-bc05-beaef2a7ba11	58d56a52-e36b-4aca-9ca1-d623f82c12df	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-05-01 16:13:26.822592+00
4c7c0c10-51c0-4536-8a32-515a656073fc	aa12f6d1-9ead-45bf-964f-e515ad8a22a0	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-05-01 16:13:30.589072+00
dc75d173-7dc8-4f46-9d4b-9ee6261348f8	76eab628-2c37-4480-83ce-87540f534c98	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-05-01 16:13:36.910795+00
1f4af182-19f6-4213-9406-8a23914d2c56	49caac40-4859-4f0e-b05e-110d24bf4e68	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-05-01 16:13:41.587028+00
a1ca726d-924f-4c99-9475-fc57ba579701	4d449a88-ee07-4c75-b18d-3d4bb6093917	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-05-01 16:13:46.186824+00
2f1fdeb8-1827-40bb-b390-0e666cebe6fa	3baf84bd-a91e-464d-ab08-fe5535a6beb3	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-05-01 16:13:49.641313+00
c59b5dd8-91c9-4289-9062-3e30f1927048	56c85c22-dcaa-4de0-8953-ff2a4688232d	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-05-01 16:13:53.557217+00
a0056d47-28d9-4648-9235-adadc32b0732	dc04cf85-16c7-4a6e-914d-62ca34465ee9	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió el estado a "completada"	\N	2026-05-01 16:13:57.04294+00
a1172283-0898-4bc7-81e6-936ea35bc424	dc53b585-7322-4dc3-b3d7-e499790507a4	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó una épica	\N	2026-05-01 16:22:42.965121+00
14e41bed-d37f-47f4-aac6-bcdaa05cd848	39e7b44c-eac7-4504-8fe4-26f67e2ed45c	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó una épica	\N	2026-05-01 16:22:50.192088+00
cd2f6870-3521-4a3f-9838-d14439b9d9c0	5ce47d36-19a0-40cd-9dc3-7f342f3e8593	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó una épica	\N	2026-05-01 16:22:57.281725+00
55ce637e-92da-4717-88af-b558f8b110de	7e83c67d-10b4-49e9-8c8b-964a3f3626a5	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:09:38.654272+00
46c42612-810d-4bb0-b7ba-a5af63218696	834bc3ec-9916-42d5-992a-a587d790f620	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:09:44.752073+00
b8089ea5-deeb-475d-a86c-12f3ca6b9bbe	347c63c8-e661-4d79-8050-4e0074e2af97	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:09:59.135902+00
6565b7fd-f95f-49e5-a820-ac4cf63a4a3a	7df852e8-5da4-467b-8abd-d76af283551d	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:17:07.086398+00
178aec9f-de6d-45c4-a8a0-29569bff80b8	6191c709-0f13-42d0-b69b-7d5dea237a15	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:17:18.263365+00
e7e7f680-4b3b-44f9-ae10-2970f75005e0	94d2a2d3-3dbb-42fb-a6bf-b7521a64b79e	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:17:23.21526+00
3a196df7-3054-4690-98c0-488a42e7e1c3	99eda663-28e8-47a8-907e-6504640bf583	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:17:28.094217+00
c1870d01-ac51-4276-8308-4c8df0a1581a	fc7fdf98-068a-4ce8-a895-a43f52f693a8	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	cambió la fecha de entrega	\N	2026-05-01 17:17:33.115781+00
42a9e44d-eed4-492c-89ba-7d3ff85134f8	ee7c0f09-a510-46f8-8ed6-2c6a4f573bd7	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-05-03 16:23:14.912854+00
bc07e4cd-bb5e-4c9c-9ad3-d16dc5a653d7	fe1fb09e-1aff-4253-b2c9-a239357cede2	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-05-03 18:35:38.707836+00
06eb0790-abb8-42d5-9adc-f25269b7ed9b	1dc42a37-0961-4e12-b059-466f5a5a783e	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó una épica	\N	2026-05-04 15:48:59.828987+00
b8a877ed-499f-4f73-abc3-c12f478b12f6	1dc42a37-0961-4e12-b059-466f5a5a783e	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó una épica	\N	2026-05-04 15:49:08.200983+00
6a021ac5-95a6-475d-9c35-1c441c5882a1	016ff391-0e8f-406c-af8b-ee25874e8c03	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-05-04 23:07:46.843452+00
af393e36-f8aa-486b-8479-69f2dc26f307	ebfe3306-0111-4f5a-bc46-99e8d81f865e	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-05-04 23:07:54.939348+00
67e41e2c-d408-41cb-b833-a98ac48809dc	7b4a91ce-77c3-4c64-b2a8-5d3333e676ad	\N	a87077af-4d41-4ea3-a738-73ee9b84b9d3	cambió el estado a "completada"	\N	2026-05-04 23:54:36.559501+00
9c9a831c-92cb-46da-b7d0-2525de29ad04	dfde5564-9954-471c-8271-b034e4b153f2	\N	60ce5ac5-9ee2-427d-98c5-f7ef2ee556f3	cambió el estado a "en_revision"	\N	2026-05-07 13:28:34.790116+00
\.


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: rxcode_dba
--

COPY public.comments (id, task_id, author_id, body, created_at, updated_at) FROM stdin;
150d9977-9eea-48a8-8ed8-100daa6a53bb	95d6f892-272d-4772-b046-11ae106b031e	a4724453-124c-45a3-a8c5-db01560300cc	@Michelle Ramirez  holi esto es una prueba de las notificaciones	2026-04-22 17:26:19.415675+00	2026-04-22 17:26:19.415675+00
f6c2305f-ac42-47d7-b6c8-d8a64b77b608	95d6f892-272d-4772-b046-11ae106b031e	a4724453-124c-45a3-a8c5-db01560300cc	jajaja falta lo de poder editar y eliminar se me olvido	2026-04-22 17:42:17.191008+00	2026-04-22 17:42:17.191008+00
360994c6-725a-4815-a0c1-65537b9f5b25	95d6f892-272d-4772-b046-11ae106b031e	a4724453-124c-45a3-a8c5-db01560300cc	@Daniel Galicia Prueba de auto llamado	2026-04-22 17:42:35.077289+00	2026-04-22 17:42:35.077289+00
09414411-281c-42a5-9508-9c2720a00c60	b36767be-07c0-41ea-b37f-5cbb410ea14e	9cc69f1b-31d7-4c7b-b913-0070158ed2e3	@Daniel Galicia Funciona?	2026-04-22 17:43:45.492409+00	2026-04-22 17:43:45.492409+00
ed764db6-b36d-4e98-ba72-2a2084c59952	9f6b64dc-aa4b-4405-bd8e-c949afd79260	a4724453-124c-45a3-a8c5-db01560300cc	@Michelle Ramirez  Oye no tentiendo algo	2026-04-24 13:29:27.940393+00	2026-04-24 13:29:27.940393+00
8d0dd4a8-2e05-4bae-8ff9-fbf2d757bc35	9f6b64dc-aa4b-4405-bd8e-c949afd79260	a4724453-124c-45a3-a8c5-db01560300cc	@Michelle Ramirez  Oye ocupo  1hr  o un dia mas	2026-04-24 13:31:55.130977+00	2026-04-24 13:31:55.130977+00
03c09726-f362-4387-ad6c-469a802ed36e	5ce47d36-19a0-40cd-9dc3-7f342f3e8593	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	@Daniel Galicia    Elimina la tarea	2026-04-27 16:41:27.205079+00	2026-04-27 16:41:27.205079+00
a76f5a3a-9d69-4fa1-9cd7-0c63686c5fa8	00426212-7970-4492-a992-1d4c8bedebe3	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	@Daniel Galicia Revisada	2026-04-27 16:42:21.911799+00	2026-04-27 16:42:21.911799+00
ee6acffa-5e5f-4a67-a043-6f3961602710	2b59fce0-ce58-4ac6-943d-f8668ef0b278	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	@Daniel Galicia  revisada	2026-04-27 16:50:21.08801+00	2026-04-27 16:50:21.08801+00
b2f99239-ce58-43ab-9513-463f9f7cc8fc	32c61311-2fdc-4d7c-92c8-b898eca6e50b	a4724453-124c-45a3-a8c5-db01560300cc	La correccion la hizo el cliente directo en su excel	2026-04-30 16:16:50.018489+00	2026-04-30 16:16:50.018489+00
419ec3e6-acf1-417f-a599-bdac256db679	5ce47d36-19a0-40cd-9dc3-7f342f3e8593	a4724453-124c-45a3-a8c5-db01560300cc	@Michelle Ramirez No me acuerdo como se eliminan xd	2026-04-30 17:58:56.358158+00	2026-04-30 17:58:56.358158+00
f77312f6-5ca1-4769-a800-7c9743cd5f5c	39e7b44c-eac7-4504-8fe4-26f67e2ed45c	a4724453-124c-45a3-a8c5-db01560300cc	@Michelle Ramirez Intenta replicarlo de nuevo por fis	2026-04-30 18:54:18.962859+00	2026-04-30 18:54:18.962859+00
18af12a2-e3c8-445a-91a0-6837544baf04	71219edf-b294-40b5-9a9d-aef242f0d311	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	@Daniel Galicia  Etsa implementacion no se  llevo a cabo debido a que el cliente lo cancelo	2026-05-01 16:15:58.634755+00	2026-05-01 16:15:58.634755+00
e9804fa6-fd91-48f3-9fcb-60d735ee2128	c321378a-a64c-4d29-9db8-3bd8eb5e0557	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	@Daniel Galicia Esta implementacion no se llevo a cabo debido a que el cliente lo cancelo	2026-05-01 16:17:00.685443+00	2026-05-01 16:17:00.685443+00
29354e7d-2c57-4e82-a206-6084805ccde8	fe502370-1edd-4952-b738-49fcc8d13fd2	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	@Daniel Galicia Esta implementacion no se llevo a cabo debido a que el cliente lo cancelo	2026-05-01 16:17:12.672362+00	2026-05-01 16:17:12.672362+00
4e243d73-9b2d-4feb-a656-dc63666b89d9	de9b2e3e-788e-485f-bb54-67880a1aec03	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	Se tiene que borrar esta tareas @Daniel Galicia	2026-05-01 16:18:51.059068+00	2026-05-01 16:18:51.059068+00
e504e073-1b08-4249-9837-4b1cef304a68	7852e7ae-9ca7-4df6-a549-5ac6272ea334	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	Eliminar @Daniel Galicia	2026-05-01 17:04:43.298534+00	2026-05-01 17:04:43.298534+00
\.


--
-- Data for Name: cycles; Type: TABLE DATA; Schema: public; Owner: rxcode_dba
--

COPY public.cycles (id, project_id, name, number, status, start_date, end_date, scope_pct, created_at, updated_at) FROM stdin;
f4201665-5140-4233-bbed-0a6afef5c345	725a2211-9531-466d-ba0b-1df66ef0e70c	Creacion del sitio	1	planificado	2026-04-15	2026-04-20	100	2026-04-22 13:22:47.554964+00	2026-04-22 13:22:47.554964+00
01375b73-d0af-4d2c-aa46-f35322c9cb3a	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	Correciones de funcionamiento [Fase 1]	1	planificado	2026-04-22	2026-04-23	100	2026-04-22 13:56:21.961826+00	2026-04-22 13:56:21.961826+00
2214bbdc-0d38-4789-9fac-6e218824478c	027fa9f0-f03f-4c18-970c-9374bace6e5b	Sincronización con Google Sheets	1	planificado	2026-04-22	2026-04-23	100	2026-04-22 15:30:25.286674+00	2026-04-22 15:30:25.286674+00
28979da5-bd3e-4a36-b586-dfac82c39485	027fa9f0-f03f-4c18-970c-9374bace6e5b	Implementación de Pasarela de Pagos	2	planificado	2026-04-22	2026-04-23	100	2026-04-22 15:37:10.19822+00	2026-04-22 15:37:10.19822+00
95ecd6c4-c407-47eb-bddc-7902bcc19012	027fa9f0-f03f-4c18-970c-9374bace6e5b	Configuración de WhatsApp Business API (Meta)	3	planificado	2026-04-22	2026-04-23	100	2026-04-22 15:43:53.450574+00	2026-04-22 15:43:53.450574+00
bf3d64d3-b4fe-41b5-a8ff-c20d1b89bc7f	027fa9f0-f03f-4c18-970c-9374bace6e5b	Sistema de Selección de Boletos	4	planificado	2026-04-22	2026-04-23	100	2026-04-22 15:46:23.503109+00	2026-04-22 15:46:23.503109+00
665d22bc-65e4-4d44-bfc1-ea14560da771	027fa9f0-f03f-4c18-970c-9374bace6e5b	Módulo Verificador de Boletos	5	planificado	2026-04-22	2026-04-23	100	2026-04-22 15:49:49.309282+00	2026-04-22 15:49:49.309282+00
3057c16c-24fb-42e4-95c7-eed1e6ae0f3f	027fa9f0-f03f-4c18-970c-9374bace6e5b	Gestión de Inventario y Disponibilidad	6	planificado	2026-04-22	2026-04-23	100	2026-04-22 15:51:47.836516+00	2026-04-22 15:51:47.836516+00
7fa540ec-8b1b-423e-9266-f0f74bf77ac4	027fa9f0-f03f-4c18-970c-9374bace6e5b	Captura de Datos y Lead Generation	7	planificado	2026-04-22	2026-04-23	100	2026-04-22 15:53:19.651768+00	2026-04-22 15:53:19.651768+00
70e20724-3924-4d83-b3da-2190c868dd3e	027fa9f0-f03f-4c18-970c-9374bace6e5b	Interfaz de Usuario (UI) y Redes Sociales	8	planificado	2026-04-22	2026-04-23	100	2026-04-22 15:59:04.272344+00	2026-04-22 15:59:04.272344+00
5be5bf35-bf12-4979-bcf4-67f36e8ae74c	027fa9f0-f03f-4c18-970c-9374bace6e5b	Visualización de Boletos Vendidos	9	planificado	2026-04-22	2026-04-23	100	2026-04-22 16:00:32.626525+00	2026-04-22 16:00:32.626525+00
618ff6cb-9f39-4f13-b3d1-60ad1cbc3489	027fa9f0-f03f-4c18-970c-9374bace6e5b	Feedback Visual de Selección	10	planificado	2026-04-22	2026-04-23	100	2026-04-22 16:02:45.804893+00	2026-04-22 16:02:45.804893+00
18dde9e5-8613-4476-8997-0dd12ae2964b	725a2211-9531-466d-ba0b-1df66ef0e70c	Desarrollo Base	2	planificado	2026-04-22	2026-04-23	100	2026-04-22 16:11:26.260963+00	2026-04-22 16:11:26.260963+00
0ea60d15-77b5-4ef6-b701-e3d897bba707	725a2211-9531-466d-ba0b-1df66ef0e70c	Descarga de Catálogos	3	planificado	2026-04-22	2026-04-23	100	2026-04-22 16:13:36.931632+00	2026-04-22 16:13:36.931632+00
96fdcb74-de66-4ae5-b1f0-79f459192526	725a2211-9531-466d-ba0b-1df66ef0e70c	Banner Dinámico	4	planificado	2026-04-22	2026-04-23	100	2026-04-22 16:14:10.472012+00	2026-04-22 16:14:10.472012+00
262de254-d31f-4532-b28f-68f6a98c93f8	725a2211-9531-466d-ba0b-1df66ef0e70c	Visualización de Productos	5	planificado	2026-04-22	2026-04-23	100	2026-04-22 16:14:45.115084+00	2026-04-22 16:14:45.115084+00
f6c4ce13-a96d-4431-94d2-2b5d83e2bdb3	725a2211-9531-466d-ba0b-1df66ef0e70c	Logística Estafeta	6	planificado	2026-04-22	2026-04-23	100	2026-04-22 16:18:41.35664+00	2026-04-22 16:18:41.35664+00
18adcfd4-4b99-45f8-a80c-c5ed4448cf5c	725a2211-9531-466d-ba0b-1df66ef0e70c	Logística Envia.com	7	planificado	2026-04-22	2026-04-23	100	2026-04-22 16:19:38.581476+00	2026-04-22 16:19:38.581476+00
cbe55d82-7c43-4a23-a5c4-845186505bcf	725a2211-9531-466d-ba0b-1df66ef0e70c	Mercado Pago	8	planificado	2026-04-22	2026-04-23	100	2026-04-22 16:20:17.411179+00	2026-04-22 16:20:17.411179+00
cdaf7e2a-abc7-45cd-b262-ec35e66244ce	725a2211-9531-466d-ba0b-1df66ef0e70c	OpenPay	9	planificado	2026-04-22	2026-04-23	100	2026-04-22 16:23:18.244007+00	2026-04-22 16:23:18.244007+00
c33e4d33-fa76-4bb3-962b-86588f6194d3	725a2211-9531-466d-ba0b-1df66ef0e70c	Facturación	10	planificado	2026-04-22	2026-04-23	100	2026-04-22 16:23:56.966346+00	2026-04-22 16:23:56.966346+00
056ed57b-ec7a-4af4-8d47-080513e70faa	725a2211-9531-466d-ba0b-1df66ef0e70c	Diseño UX	11	planificado	2026-04-22	2026-04-23	100	2026-04-22 16:26:52.776432+00	2026-04-22 16:26:52.776432+00
10bad6ed-f8a3-466f-9ee7-958b19860a2e	725a2211-9531-466d-ba0b-1df66ef0e70c	Ajustes Específicos	12	planificado	2026-04-22	2026-04-23	100	2026-04-22 16:27:47.61881+00	2026-04-22 16:27:47.61881+00
43fb6f77-d615-46c2-b24b-7be3cd5da718	725a2211-9531-466d-ba0b-1df66ef0e70c	Maquetación Responsive	13	planificado	2026-04-22	2026-04-23	100	2026-04-22 16:30:47.007299+00	2026-04-22 16:30:47.007299+00
b8d718f8-1e71-4de8-994c-c28e2559a99c	725a2211-9531-466d-ba0b-1df66ef0e70c	Animaciones	14	planificado	2026-04-22	2026-04-23	100	2026-04-22 16:31:44.926758+00	2026-04-22 16:31:44.926758+00
4be47c45-1e37-45f5-8331-d72e01358b4a	725a2211-9531-466d-ba0b-1df66ef0e70c	Configuración Técnica	15	planificado	2026-04-22	2026-04-23	100	2026-04-22 16:32:24.677536+00	2026-04-22 16:32:24.677536+00
f98df020-059d-4d67-bc86-b3ae2a99a28c	725a2211-9531-466d-ba0b-1df66ef0e70c	Jerarquía del Header	16	planificado	2026-04-22	2026-04-23	100	2026-04-22 16:38:49.963767+00	2026-04-22 16:38:49.963767+00
2831a07f-27e3-46b3-bd27-13403a879dc0	725a2211-9531-466d-ba0b-1df66ef0e70c	Personalización de Iconos	17	planificado	2026-04-22	2026-04-23	100	2026-04-22 16:39:33.013478+00	2026-04-22 16:39:33.013478+00
83ef4979-4e00-4ca6-9702-b751651c3af7	725a2211-9531-466d-ba0b-1df66ef0e70c	Optimización de Logo en Checkout	18	planificado	2026-04-22	2026-04-23	100	2026-04-22 16:40:19.899566+00	2026-04-22 16:40:19.899566+00
27fc5949-bdf4-4347-8744-8f42f9c709fb	725a2211-9531-466d-ba0b-1df66ef0e70c	Navegación de Producto (Breadcrumbs)	19	planificado	2026-04-22	2026-04-23	100	2026-04-22 16:40:59.871336+00	2026-04-22 16:40:59.871336+00
4b5571c8-26a5-41a1-bcb7-83f191dfade0	725a2211-9531-466d-ba0b-1df66ef0e70c	Sección de Interacción	20	planificado	2026-04-22	2026-04-23	100	2026-04-22 16:41:49.899781+00	2026-04-22 16:41:49.899781+00
8eb08010-5c7a-4abd-8ac9-ea5c005c7fd9	725a2211-9531-466d-ba0b-1df66ef0e70c	Simetría de Botones	21	planificado	2026-04-22	2026-04-23	100	2026-04-22 16:42:29.412681+00	2026-04-22 16:42:29.412681+00
2a688f53-df8e-46f2-bc3b-8ba63623af9f	725a2211-9531-466d-ba0b-1df66ef0e70c	Depuración de Pasarelas de Pago	22	planificado	2026-04-22	2026-04-23	100	2026-04-22 16:46:52.201928+00	2026-04-22 16:46:52.201928+00
29e0fae3-011b-43fd-9060-4f639e436702	725a2211-9531-466d-ba0b-1df66ef0e70c	Limpieza de Checkout	23	planificado	2026-04-22	2026-04-23	100	2026-04-22 16:47:32.109823+00	2026-04-22 16:47:32.109823+00
af21299f-55c2-48cc-93ef-b5a14d3a9b26	725a2211-9531-466d-ba0b-1df66ef0e70c	Estandarización de Marcas	24	planificado	2026-04-22	2026-04-23	100	2026-04-22 16:48:17.332012+00	2026-04-22 16:48:17.332012+00
f743b2db-8d13-4cf8-8297-67cadad4373d	725a2211-9531-466d-ba0b-1df66ef0e70c	Actualización de Contacto	25	planificado	2026-04-22	2026-04-23	100	2026-04-22 16:48:56.725871+00	2026-04-22 16:48:56.725871+00
d98501a2-81ee-4e5f-a6bf-0daa8ab82755	725a2211-9531-466d-ba0b-1df66ef0e70c	Integración de Categorías	26	planificado	2026-04-22	2026-04-23	100	2026-04-22 16:49:43.394111+00	2026-04-22 16:49:43.394111+00
b52d554a-f271-4f88-9a30-9b88980d6c9f	725a2211-9531-466d-ba0b-1df66ef0e70c	Ajuste de Comportamiento Visual	27	planificado	2026-04-22	2026-04-23	100	2026-04-22 16:50:17.661169+00	2026-04-22 16:50:17.661169+00
6a699ad4-89f0-4fbb-865d-9f8daede805a	725a2211-9531-466d-ba0b-1df66ef0e70c	Corrección de correo	28	planificado	2026-04-22	2026-04-23	100	2026-04-22 16:50:50.988059+00	2026-04-22 16:50:50.988059+00
0f769e60-7558-46fc-a00d-c01b8d262d45	4f13a9e6-930d-45e8-9f68-acccef604a9d	Diseño de base de datos	1	activo	2026-04-27	2026-04-29	100	2026-04-27 15:44:19.806985+00	2026-04-27 15:44:19.806985+00
c4bd0c8b-76ae-4a72-a042-4c47e501b7e9	4f13a9e6-930d-45e8-9f68-acccef604a9d	Proxy de Integración e Historial de Cambios	8	planificado	2026-05-05	2026-05-12	100	2026-04-28 15:15:54.33092+00	2026-04-30 13:46:53.772622+00
0d35f643-cb46-4195-812f-fee34709060f	4f13a9e6-930d-45e8-9f68-acccef604a9d	Autenticación y Gestión de Sitios	7	planificado	2026-04-30	2026-05-04	100	2026-04-28 15:15:17.055087+00	2026-04-30 13:47:40.565649+00
00f94cfc-858e-412e-9145-590a8da7695a	4f13a9e6-930d-45e8-9f68-acccef604a9d	Deploy Final y Automatización (Backups)	6	planificado	2026-05-14	2026-05-15	100	2026-04-28 15:12:41.376223+00	2026-04-30 13:50:21.517777+00
d4b8be42-4922-4e81-8d86-d399d8aa4281	f510a515-f9b5-41d2-ae13-288afe2ae69f	fsafasfsfafasf	1	planificado	2026-04-16	2026-04-20	100	2026-04-30 17:57:30.673486+00	2026-04-30 17:57:30.673486+00
794d5e7a-6e24-47b3-8da9-3ee7d3c86529	4f13a9e6-930d-45e8-9f68-acccef604a9d	UXUI	2	activo	2026-05-01	2026-05-03	100	2026-04-27 16:38:16.931349+00	2026-05-01 17:19:23.266503+00
9ad22747-cf29-4ad9-a099-56d5c06354a8	4f13a9e6-930d-45e8-9f68-acccef604a9d	Gestión de Contenido y Temas Dinámicos	4	planificado	2026-05-07	2026-05-11	100	2026-04-28 15:11:07.065369+00	2026-05-01 17:20:12.829562+00
c8658228-e47d-48d8-8527-3530eadd5618	4f13a9e6-930d-45e8-9f68-acccef604a9d	Login y Panel Principal (Interfaz)	3	planificado	2026-05-04	2026-05-06	100	2026-04-28 15:10:29.323757+00	2026-05-01 17:20:42.215252+00
05307575-a07c-4dee-a3a3-b54f80e3d1f1	4f13a9e6-930d-45e8-9f68-acccef604a9d	Infraestructura (VPS, Docker y Nginx	5	planificado	2026-05-12	2026-05-14	100	2026-04-28 15:11:58.259634+00	2026-05-01 17:21:20.715355+00
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: rxcode_dba
--

COPY public.documents (id, project_id, title, body, author_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: epics; Type: TABLE DATA; Schema: public; Owner: rxcode_dba
--

COPY public.epics (id, project_id, name, description, status, hill_position, created_by, created_at, updated_at, parent_epic_id) FROM stdin;
63321493-29ca-487f-9ee7-55ac71060545	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	Asignacion de tareas a proyectos	Debes generar cada Epica y tarea a cada proyecto	activa	\N	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-22 13:45:47.795288+00	2026-04-22 13:45:47.795288+00	\N
32659c70-ccc3-4f0d-b444-759e14237e01	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	Correciones del funcionamiento del siio	\N	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22 13:47:47.224363+00	2026-04-22 13:47:47.224363+00	\N
8b63a83a-965c-4f06-a057-fd7bce03639c	027fa9f0-f03f-4c18-970c-9374bace6e5b	Integración	Conexiones y APIs	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22 14:48:33.777574+00	2026-04-22 14:48:33.777574+00	\N
dd936700-73c0-49a4-b0ab-c531a0696d44	027fa9f0-f03f-4c18-970c-9374bace6e5b	Funcionales	Lógica de Negocio	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22 15:45:07.508832+00	2026-04-22 15:45:07.508832+00	\N
9dc22c5e-c35a-4a44-a761-fd3ac0a0b1df	027fa9f0-f03f-4c18-970c-9374bace6e5b	Diseño	Interfaz y UX	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22 15:56:38.790441+00	2026-04-22 15:56:38.790441+00	\N
666ce9bf-453e-4b78-b3c5-78bd2e9b145f	027fa9f0-f03f-4c18-970c-9374bace6e5b	Animacion	Interacción	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22 16:01:21.269396+00	2026-04-22 16:01:21.269396+00	\N
7edb86b7-7239-4712-a80b-1cf35bbd37de	725a2211-9531-466d-ba0b-1df66ef0e70c	Funcionales	Requerimiento Funcionales	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22 16:10:33.724821+00	2026-04-22 16:10:33.724821+00	\N
d00cd5db-49bd-4ab4-8a31-c047660571f7	725a2211-9531-466d-ba0b-1df66ef0e70c	Interacciones configuradas	Interacciones configuradas	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22 16:16:37.145664+00	2026-04-22 16:16:37.145664+00	\N
2b397aa2-0963-44ec-b095-9385aa21a82f	725a2211-9531-466d-ba0b-1df66ef0e70c	Diseño UX	Diseño UX	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22 16:24:52.669492+00	2026-04-22 16:24:52.669492+00	\N
fe7566e4-5560-4043-a650-8e265b85ec34	725a2211-9531-466d-ba0b-1df66ef0e70c	Animación, rendimiento y dominio	Animación, rendimiento y dominio	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22 16:28:43.175627+00	2026-04-22 16:28:43.175627+00	\N
43ea57f7-ae68-4f98-93d6-b8e4986dc948	725a2211-9531-466d-ba0b-1df66ef0e70c	Ajustes adicionales	Ajustes adicionales	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22 16:33:08.404885+00	2026-04-22 16:33:08.404885+00	\N
8508f132-e1f8-4b2a-ac66-14d58453b09b	725a2211-9531-466d-ba0b-1df66ef0e70c	Lista de correcciones	Lista de correcciones	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22 16:43:25.973174+00	2026-04-22 16:43:25.973174+00	\N
f2df276b-b88b-411c-ae00-8f013de9059e	a092bc84-7294-4ce0-9261-d410e04c0359	EPICA HIJA	safasfa	activa	\N	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-22 17:40:37.062669+00	2026-04-22 17:40:37.062669+00	6f5140f2-e7fc-459e-a875-8d66b8db75e6
491c47b7-c475-46aa-a26c-fc8a715756b8	a092bc84-7294-4ce0-9261-d410e04c0359	MEGA EPICA	asfadfasdfas	activa	\N	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-22 17:40:50.371682+00	2026-04-22 17:40:50.371682+00	\N
6f5140f2-e7fc-459e-a875-8d66b8db75e6	a092bc84-7294-4ce0-9261-d410e04c0359	GRAN EPICA	dsfas	activa	\N	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-22 17:40:24.232251+00	2026-04-22 17:40:50.530704+00	491c47b7-c475-46aa-a26c-fc8a715756b8
637c9b2d-c7f6-4f0e-bdab-6e76d3650f85	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	Logica de encapsulamiento de espacios de trabajo por usuario	se van a corregir temas de asignacion de tareas y vistas en la aplicacion	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-24 15:34:51.225451+00	2026-04-24 15:34:51.225451+00	32659c70-ccc3-4f0d-b444-759e14237e01
1684e59c-5cc0-4df4-9866-6726e21da18c	4f13a9e6-930d-45e8-9f68-acccef604a9d	Requerimientos Funcionales	Épica raíz de todos los requerimientos funcionales del sistema.	activa	\N	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-24 16:37:14.854712+00	2026-04-24 16:37:14.854712+00	\N
fcf698e2-09c8-4b10-b8a1-f62be1f1b9e9	4f13a9e6-930d-45e8-9f68-acccef604a9d	Diseño / UX·UI	Épica raíz del sistema de diseño, pantallas y accesibilidad.	activa	\N	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-24 16:37:15.039551+00	2026-04-24 16:37:15.039551+00	\N
8eecbd86-27f1-49a3-9f7e-8fc19b5bf03c	4f13a9e6-930d-45e8-9f68-acccef604a9d	DevOps	Épica raíz de infraestructura, deploy y documentación.	activa	\N	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-24 16:37:15.199201+00	2026-04-24 16:37:15.199201+00	\N
7a4a983a-f726-4911-b998-15f5700ed65d	4f13a9e6-930d-45e8-9f68-acccef604a9d	Backend	Módulos backend: auth, sitios, proxy, historial y configuración.	activa	\N	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-24 16:37:15.263502+00	2026-04-24 16:37:15.263502+00	1684e59c-5cc0-4df4-9866-6726e21da18c
4c4d3b73-7609-4342-81f4-9cbefc7dab4e	4f13a9e6-930d-45e8-9f68-acccef604a9d	Frontend	Módulos frontend: auth, panel de sitios, sidebar y temas dinámicos.	activa	\N	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-24 16:37:15.316462+00	2026-04-24 16:37:15.316462+00	1684e59c-5cc0-4df4-9866-6726e21da18c
8d25f4c7-becb-48dd-8483-0c39cd111692	4f13a9e6-930d-45e8-9f68-acccef604a9d	UX·UI	Sistema de diseño base, diseño de pantallas y responsividad.	activa	\N	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-24 16:37:15.469639+00	2026-04-24 16:37:15.469639+00	fcf698e2-09c8-4b10-b8a1-f62be1f1b9e9
b6e9dfcf-cc7d-4857-8a89-a78b2d7dd1fe	4f13a9e6-930d-45e8-9f68-acccef604a9d	Infraestructura	VPS, Docker, Nginx, deploy y operaciones.	activa	\N	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-24 16:37:15.596824+00	2026-04-24 16:37:15.596824+00	8eecbd86-27f1-49a3-9f7e-8fc19b5bf03c
3a6d5297-7e3e-42cb-8a52-d34aff06b3c1	4f13a9e6-930d-45e8-9f68-acccef604a9d	Documentación	README del proyecto y documentación técnica del backend.	activa	\N	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-24 16:37:15.650021+00	2026-04-24 16:37:15.650021+00	8eecbd86-27f1-49a3-9f7e-8fc19b5bf03c
65a1cc5d-ab90-4bfb-aaac-8fa1500769c4	4f13a9e6-930d-45e8-9f68-acccef604a9d	Autenticación y gestión de usuarios	Registro, login, sesiones JWT, renovación de tokens y administración de cuentas.	activa	\N	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-24 16:37:15.698674+00	2026-04-24 16:37:15.698674+00	7a4a983a-f726-4911-b998-15f5700ed65d
c3f1acc9-f071-4af1-9f59-a9696ff2f676	4f13a9e6-930d-45e8-9f68-acccef604a9d	Gestión de sitios registrados	CRUD de sitios estáticos. api_token encriptado en BD con Fernet.	activa	\N	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-24 16:37:15.748309+00	2026-04-24 16:37:15.748309+00	7a4a983a-f726-4911-b998-15f5700ed65d
c5fd6b9d-eda3-4322-a997-fe04eeef8408	4f13a9e6-930d-45e8-9f68-acccef604a9d	Proxy — integración con sitios externos	El panel actúa como intermediario entre el usuario y la API REST del sitio estático.	activa	\N	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-24 16:37:15.797795+00	2026-04-24 16:37:15.797795+00	7a4a983a-f726-4911-b998-15f5700ed65d
acd43e7c-6a84-4702-87a6-44348f2fb33a	4f13a9e6-930d-45e8-9f68-acccef604a9d	Historial de cambios	Registro automático de cada PUT o DELETE exitoso vía proxy. Auditoría por sitio.	activa	\N	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-24 16:37:15.845524+00	2026-04-24 16:37:15.845524+00	7a4a983a-f726-4911-b998-15f5700ed65d
a684048f-e470-463f-ba1b-597ed4337fcc	4f13a9e6-930d-45e8-9f68-acccef604a9d	Base de datos y configuración	Engine async PostgreSQL, sesión, migraciones Alembic y pydantic-settings.	activa	\N	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-24 16:37:15.974321+00	2026-04-24 16:37:15.974321+00	7a4a983a-f726-4911-b998-15f5700ed65d
5ea59ed3-ed6d-4b0c-966b-28b48d18370f	4f13a9e6-930d-45e8-9f68-acccef604a9d	Login / Autenticación	Pantalla de login, tokens en cliente, interceptor de renovación automática y logout.	activa	\N	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-24 16:37:16.023328+00	2026-04-24 16:37:16.023328+00	4c4d3b73-7609-4342-81f4-9cbefc7dab4e
bba769c9-c6c9-4942-a7ce-eff237688f7b	4f13a9e6-930d-45e8-9f68-acccef604a9d	Panel principal — sitios	Lista de sitios, formularios de creación/edición y vista detalle con tema dinámico.	activa	\N	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-24 16:37:16.071881+00	2026-04-24 16:37:16.071881+00	4c4d3b73-7609-4342-81f4-9cbefc7dab4e
6f29f909-98c9-4a27-909e-1111ccac4c3a	4f13a9e6-930d-45e8-9f68-acccef604a9d	Barra lateral	Sidebar fijo con secciones Colores, Logos, Contenido e Historial.	activa	\N	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-24 16:37:16.214254+00	2026-04-24 16:37:16.214254+00	4c4d3b73-7609-4342-81f4-9cbefc7dab4e
279cf786-de7c-467f-a67a-1da9be44ef8b	4f13a9e6-930d-45e8-9f68-acccef604a9d	Sistema de temas dinámico	El panel aplica en tiempo real los colores y logo de la marca del sitio activo.	activa	\N	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-24 16:37:16.263921+00	2026-04-24 16:37:16.263921+00	4c4d3b73-7609-4342-81f4-9cbefc7dab4e
d01647a3-9317-4bbc-93e5-ac75d96f79a7	4f13a9e6-930d-45e8-9f68-acccef604a9d	Sistema de diseño base	Tokens, componentes reutilizables e iconografía del panel.	activa	\N	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-24 16:37:16.310149+00	2026-04-24 16:37:16.310149+00	8d25f4c7-becb-48dd-8483-0c39cd111692
4c1ddf19-9825-49d9-af75-1e7e61ad87e4	4f13a9e6-930d-45e8-9f68-acccef604a9d	Responsivo y accesibilidad	Sidebar colapsable en medianas, ARIA en todos los componentes interactivos.	activa	\N	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-24 16:37:16.527262+00	2026-04-24 16:37:16.527262+00	8d25f4c7-becb-48dd-8483-0c39cd111692
2386ce78-c07a-4ba0-b711-404e5a0acf1c	4f13a9e6-930d-45e8-9f68-acccef604a9d	Configuración del VPS Linux	Ubuntu 22.04 LTS. Docker en host. Nginx en host como reverse proxy. Certbot SSL.	activa	\N	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-24 16:37:16.575014+00	2026-04-24 16:37:16.575014+00	b6e9dfcf-cc7d-4857-8a89-a78b2d7dd1fe
dcfbce7f-d25b-4ebf-aa62-e7affa23f0bf	4f13a9e6-930d-45e8-9f68-acccef604a9d	Docker y Docker Compose	Tres servicios: db (Postgres 15), backend (FastAPI 8000), frontend (Next.js 3000).	activa	\N	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-24 16:37:16.718464+00	2026-04-24 16:37:16.718464+00	b6e9dfcf-cc7d-4857-8a89-a78b2d7dd1fe
087bd354-26a1-4f5f-8f97-8352ff245596	4f13a9e6-930d-45e8-9f68-acccef604a9d	Nginx — reverse proxy	Enruta / al frontend, /api/ al backend, /uploads/ como directorio estático.	activa	\N	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-24 16:37:16.766469+00	2026-04-24 16:37:16.766469+00	b6e9dfcf-cc7d-4857-8a89-a78b2d7dd1fe
3b1c64ca-4cf1-42bc-bc62-9917bf4ecdc4	4f13a9e6-930d-45e8-9f68-acccef604a9d	Deploy y operaciones	Deploy manual por SSH. Script de deploy y backup diario con cron.	activa	\N	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-24 16:37:16.814221+00	2026-04-24 16:37:16.814221+00	b6e9dfcf-cc7d-4857-8a89-a78b2d7dd1fe
746331b6-65d2-4a1a-a622-be391c4b57ac	4f13a9e6-930d-45e8-9f68-acccef604a9d	README del proyecto	Documentación completa para levantar en local y hacer deploy en VPS.	activa	\N	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-24 16:37:16.861629+00	2026-04-24 16:37:16.861629+00	3a6d5297-7e3e-42cb-8a52-d34aff06b3c1
f5824ba1-f569-44fb-a6ba-f43aa417632d	4f13a9e6-930d-45e8-9f68-acccef604a9d	Documentación técnica del backend	Endpoints en Swagger, contrato para sitios externos y estándares de código.	activa	\N	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-24 16:37:16.908397+00	2026-04-24 16:37:16.908397+00	3a6d5297-7e3e-42cb-8a52-d34aff06b3c1
ae2302cf-aeb1-4c8b-95cd-22ea119f8ad1	c70b1f17-d0d0-4706-b77c-97ed59c954d5	Maquetacion de sitio	Exploracion de ideas o referencias para el producto final	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-27 16:48:24.463372+00	2026-04-27 16:48:24.463372+00	\N
1daebcc3-1098-42bf-b734-035f2cb6cc9c	bab1aa48-dc68-4165-8847-30e240091641	DevOps	Épica raíz de infraestructura, deploy y documentación.	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-27 17:05:26.566913+00	2026-04-27 17:05:26.566913+00	\N
878c68b4-faf1-4784-a397-d9daa2a96b13	bab1aa48-dc68-4165-8847-30e240091641	Diseño / UX·UI	Épica raíz del sistema de diseño, pantallas y accesibilidad.	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-27 17:05:50.092891+00	2026-04-27 17:05:50.092891+00	\N
2b875e8f-81a3-4da0-853d-c177d7f37396	bab1aa48-dc68-4165-8847-30e240091641	Requerimientos Funcionales	Épica raíz de todos los requerimientos funcionales del sistema.	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-27 17:06:15.930218+00	2026-04-27 17:06:15.930218+00	\N
22bd13d8-85d1-4038-a710-8210221f4dc2	bab1aa48-dc68-4165-8847-30e240091641	Documentacion	README del proyecto y documentación técnica del backend.	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-27 17:07:08.273216+00	2026-04-27 17:07:08.273216+00	1daebcc3-1098-42bf-b734-035f2cb6cc9c
7c045a8a-a875-4eb8-a750-16e56c287315	bab1aa48-dc68-4165-8847-30e240091641	Infraestructura	VPS, Docker, Nginx, deploy y operaciones.	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-27 17:07:37.654362+00	2026-04-27 17:07:37.654362+00	1daebcc3-1098-42bf-b734-035f2cb6cc9c
81476c05-da4f-48ee-abab-fbef673b9993	bab1aa48-dc68-4165-8847-30e240091641	UX-UI	Sistema de diseño base, diseño de pantallas y responsividad.	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-27 17:08:09.579274+00	2026-04-27 17:08:09.579274+00	878c68b4-faf1-4784-a397-d9daa2a96b13
701d8dd9-6802-428c-9893-6658dc6850e9	bab1aa48-dc68-4165-8847-30e240091641	Backend	Módulos backend: auth, sitios, proxy, historial y configuración.	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-27 17:08:36.583397+00	2026-04-27 17:08:36.583397+00	2b875e8f-81a3-4da0-853d-c177d7f37396
f0dc2afd-691b-4bc0-b20d-ccde74317f16	bab1aa48-dc68-4165-8847-30e240091641	Frontend	Módulos frontend: auth, panel de sitios, sidebar y temas dinámicos.	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-27 17:09:25.759685+00	2026-04-27 17:09:25.759685+00	2b875e8f-81a3-4da0-853d-c177d7f37396
56ec65b0-f6d9-46c0-99eb-8f02ea4cd26c	bab1aa48-dc68-4165-8847-30e240091641	Maquetacion del sitio en desktop	Vision general de la pagina en computadoras	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-27 17:16:05.489624+00	2026-04-27 17:16:05.489624+00	81476c05-da4f-48ee-abab-fbef673b9993
f42f1212-3e8d-40a7-bbcc-3556db92d742	bab1aa48-dc68-4165-8847-30e240091641	Maquetacion movil	Vision del sitio en el telefono	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-27 17:16:47.186825+00	2026-04-27 17:16:47.186825+00	81476c05-da4f-48ee-abab-fbef673b9993
35505d6c-26c7-4ac2-8720-9b0378cb999b	4f13a9e6-930d-45e8-9f68-acccef604a9d	Diseño de pantallas	Diseño de todas las vistas: login, dashboard, detalle de sitio, sidebar y secciones.	activa	\N	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-24 16:37:16.471696+00	2026-04-28 13:24:14.430654+00	8d25f4c7-becb-48dd-8483-0c39cd111692
737f4b1f-26e1-49ab-9ed9-5d68efb22da6	027fa9f0-f03f-4c18-970c-9374bace6e5b	Correccion de errores	Correccion de errores del sitio	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-28 15:32:55.244594+00	2026-04-28 15:32:55.244594+00	\N
d6414c59-d461-462d-8a6b-e3a0d4c0e777	027fa9f0-f03f-4c18-970c-9374bace6e5b	Mejoras al sitio	Mejoras al sitio	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-28 15:53:32.546486+00	2026-04-28 15:53:32.546486+00	\N
f9b06e45-3fd9-4736-bdaa-20889df62b32	d24e523f-8e3e-46e1-be30-f8271ceb610c	UX-UI	Vision de la aplicacion	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-28 16:30:39.01276+00	2026-04-28 16:30:39.01276+00	\N
8395ccdf-b355-4830-9bce-cfa0529c037b	d24e523f-8e3e-46e1-be30-f8271ceb610c	Inventario y Producto Terminado (RF-01 + RD-03)	Control visual inmediato del stock.	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-28 17:22:29.728327+00	2026-04-28 17:22:29.728327+00	f9b06e45-3fd9-4736-bdaa-20889df62b32
2816c86d-99fc-49bf-942e-cc933765c5e6	d24e523f-8e3e-46e1-be30-f8271ceb610c	Costos y Recetario / Escandallos (RF-02)	Precisión financiera en la carga de datos.	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-28 17:24:31.953879+00	2026-04-28 17:24:31.953879+00	f9b06e45-3fd9-4736-bdaa-20889df62b32
a48bf78e-3301-46b2-8504-b54a26f0f219	d24e523f-8e3e-46e1-be30-f8271ceb610c	Punto de Venta (POS) y Cobro (RF-03 + RF-05)	Velocidad de transacciones en horas pico.	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-28 17:26:27.673229+00	2026-04-28 17:26:27.673229+00	f9b06e45-3fd9-4736-bdaa-20889df62b32
b74e358a-b832-477f-ba69-4e3e46a121ee	d24e523f-8e3e-46e1-be30-f8271ceb610c	Rentabilidad y Cierre (RF-04 + RF-06 + RD-02)	Visibilidad del éxito del negocio.	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-28 17:28:26.982384+00	2026-04-28 17:28:26.982384+00	f9b06e45-3fd9-4736-bdaa-20889df62b32
ec5bd7b2-f821-435b-9be9-97aa2b5408c8	d24e523f-8e3e-46e1-be30-f8271ceb610c	Sistema de Diseño Base (RD-01 + RI-02)	\N	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-28 17:30:26.119955+00	2026-04-28 17:30:26.119955+00	f9b06e45-3fd9-4736-bdaa-20889df62b32
b5582411-2d06-4545-81e5-989bf2540353	2b3e7ea3-1d8c-40c8-949f-542542aac626	sadfasfdsa	\N	activa	\N	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-29 23:00:55.041812+00	2026-04-29 23:00:55.041812+00	\N
be099d4a-bea0-43a1-84a0-c8e6a93ddb47	2b3e7ea3-1d8c-40c8-949f-542542aac626	Epica	Esta epica	activa	\N	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-29 23:00:25.789292+00	2026-04-29 23:01:04.704304+00	b5582411-2d06-4545-81e5-989bf2540353
3a494394-0e56-4169-9da1-590ac85dd71f	2b3e7ea3-1d8c-40c8-949f-542542aac626	sadfasfasfdafdsa	\N	activa	\N	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-29 23:01:23.82321+00	2026-04-29 23:01:23.82321+00	b5582411-2d06-4545-81e5-989bf2540353
dd87a90c-b3a3-490e-a557-ef20a608e7dd	2b3e7ea3-1d8c-40c8-949f-542542aac626	fasfsfasfa	\N	activa	\N	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-29 23:02:20.124914+00	2026-04-29 23:02:20.124914+00	\N
27985150-fe1d-4851-aea0-105779010941	027fa9f0-f03f-4c18-970c-9374bace6e5b	Nuevos agregados al sitio	\N	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-30 16:12:20.522558+00	2026-04-30 16:12:20.522558+00	\N
290c8e51-271f-4e71-bd74-50826422c1bc	027fa9f0-f03f-4c18-970c-9374bace6e5b	Panel	\N	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-30 16:12:41.71242+00	2026-04-30 16:12:41.71242+00	27985150-fe1d-4851-aea0-105779010941
798aaa50-f82d-4900-99d3-e74af44e83ad	725a2211-9531-466d-ba0b-1df66ef0e70c	Agregados al sitio	\N	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-30 16:18:05.866443+00	2026-04-30 16:18:05.866443+00	\N
1d2baca6-9a8d-4148-a931-1e192acb3788	725a2211-9531-466d-ba0b-1df66ef0e70c	Footer	\N	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-30 16:18:39.698909+00	2026-04-30 16:18:39.698909+00	798aaa50-f82d-4900-99d3-e74af44e83ad
f3ce04f9-c71b-4a94-91d7-1acc9366b668	725a2211-9531-466d-ba0b-1df66ef0e70c	Manuales	\N	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-30 16:20:54.452847+00	2026-04-30 16:20:54.452847+00	798aaa50-f82d-4900-99d3-e74af44e83ad
7c1cd6b7-9c0a-4ea7-ab2f-ccc0cd55eccd	725a2211-9531-466d-ba0b-1df66ef0e70c	pagina individualpor categoria	\N	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-30 16:24:34.972902+00	2026-04-30 16:24:34.972902+00	798aaa50-f82d-4900-99d3-e74af44e83ad
f5227599-800c-4443-af2b-f217168ac169	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	Ajustes a los cycles	\N	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-05-01 16:22:20.59973+00	2026-05-01 16:22:20.59973+00	32659c70-ccc3-4f0d-b444-759e14237e01
756e6bde-eeea-47c4-91e3-e7d8381caaa2	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	Mejoras a Flow	Agregados nuevos para la aplicacion	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-27 17:00:44.158418+00	2026-05-01 16:35:59.429157+00	\N
9d5fb147-85eb-4d1b-89d3-41747773f473	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	Integraciones	\N	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-05-01 16:34:37.231929+00	2026-05-01 16:35:59.585814+00	756e6bde-eeea-47c4-91e3-e7d8381caaa2
56a2ceb8-5331-43ce-9c9c-58fb91591a28	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	Discord	\N	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-05-01 16:36:36.783587+00	2026-05-01 16:36:36.783587+00	9d5fb147-85eb-4d1b-89d3-41747773f473
64526d6a-6cfa-4f1c-8a52-c2ac8b241fcb	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	Sistema de recompensas	\N	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-05-01 16:43:14.628402+00	2026-05-01 16:43:41.724915+00	756e6bde-eeea-47c4-91e3-e7d8381caaa2
fae89dc3-6b18-400f-b04c-bd94a1381d99	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	Implementar vistas de licencias	pagina informativa para permitir crear cuentas e ingresar a cuentas	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-05-01 16:59:21.353019+00	2026-05-01 16:59:21.353019+00	756e6bde-eeea-47c4-91e3-e7d8381caaa2
0f647d69-802e-4260-8911-84bc2c004244	8293a962-1901-46bb-9ab6-bb151126376b	Diseño de base de datos	\N	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-05-04 15:44:10.557261+00	2026-05-04 15:44:10.557261+00	\N
c8efc86a-30d5-45ce-a077-bcd2cce7df90	8293a962-1901-46bb-9ab6-bb151126376b	Reglas de negocio	\N	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-05-04 15:44:24.859443+00	2026-05-04 15:44:24.859443+00	\N
b7ab6c66-8ae8-4442-8915-72360a9726d6	8293a962-1901-46bb-9ab6-bb151126376b	Frontend	\N	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-05-04 15:44:45.118888+00	2026-05-04 15:44:45.118888+00	\N
7b0fc78b-84f1-4838-945a-018c1bb785a3	8293a962-1901-46bb-9ab6-bb151126376b	Backend	\N	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-05-04 15:45:01.3458+00	2026-05-04 15:45:01.3458+00	\N
c6dafb4e-423a-4d82-8e31-8dabd6c7c14b	8293a962-1901-46bb-9ab6-bb151126376b	Infraestructura	\N	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-05-04 15:45:20.011543+00	2026-05-04 15:45:20.011543+00	\N
\.


--
-- Data for Name: integrations; Type: TABLE DATA; Schema: public; Owner: rxcode_dba
--

COPY public.integrations (id, provider, connected_as, access_token_enc, status, connected_by, connected_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: labels; Type: TABLE DATA; Schema: public; Owner: rxcode_dba
--

COPY public.labels (id, project_id, name, color) FROM stdin;
\.


--
-- Data for Name: license_members; Type: TABLE DATA; Schema: public; Owner: rxcode_dba
--

COPY public.license_members (license_id, user_id, role, joined_at) FROM stdin;
\.


--
-- Data for Name: licenses; Type: TABLE DATA; Schema: public; Owner: rxcode_dba
--

COPY public.licenses (id, name, owner_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: rxcode_dba
--

COPY public.notifications (id, recipient_id, sender_id, type, task_id, project_id, message, read, created_at) FROM stdin;
a92ea6a9-4e81-4aff-aaeb-c8e516365016	ec88a68e-5a20-402b-bd82-4dd854ce7fbf	ec88a68e-5a20-402b-bd82-4dd854ce7fbf	mention	\N	\N	Ana te mencionó en ENG-12	f	2026-04-21 23:19:08.4382+00
28159519-3b2c-456a-96d1-02fa6bf5ca2d	ec88a68e-5a20-402b-bd82-4dd854ce7fbf	dc67abc3-0181-4e89-ac27-4618553832d0	asignado	\N	\N	Luis te asignó ENG-18	f	2026-04-21 23:19:08.4382+00
47d7bb80-580d-4cb6-98eb-2470b1345c13	ec88a68e-5a20-402b-bd82-4dd854ce7fbf	1b827dbe-7d8e-41c4-bde2-3ab6c8e8cb0b	comentario	\N	\N	Sara comentó en DES-04	f	2026-04-21 23:19:08.4382+00
6e18f899-3b8a-474c-a925-756b93c5957c	ec88a68e-5a20-402b-bd82-4dd854ce7fbf	fac2efa8-e7aa-4dbf-8c93-bec6df3fe54e	comentario	\N	\N	Juan comentó en ENG-22	f	2026-04-21 23:19:08.4382+00
388185f8-12b4-4824-876a-13e6984554b0	a4724453-124c-45a3-a8c5-db01560300cc	9cc69f1b-31d7-4c7b-b913-0070158ed2e3	mention	b36767be-07c0-41ea-b37f-5cbb410ea14e	\N	te mencionó: "@Daniel Galicia Funciona?"	t	2026-04-22 17:43:45.496767+00
f28b0481-5987-42f2-b89e-663d88e1af86	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	mention	5ce47d36-19a0-40cd-9dc3-7f342f3e8593	\N	te mencionó: "@Daniel Galicia    Elimina la tarea"	f	2026-04-27 16:41:27.208836+00
620831eb-928d-4438-b4fa-3dc2ad8c5050	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	mention	00426212-7970-4492-a992-1d4c8bedebe3	\N	te mencionó: "@Daniel Galicia Revisada"	f	2026-04-27 16:42:21.917512+00
5c4d3e66-ed23-46ad-bab2-d481cdab20bb	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	a4724453-124c-45a3-a8c5-db01560300cc	mention	9f6b64dc-aa4b-4405-bd8e-c949afd79260	\N	te mencionó: "@Michelle Ramirez  Oye ocupo  1hr  o un dia mas"	t	2026-04-24 13:31:55.138722+00
d2055a8f-59ad-4a90-aea9-981f6660a9bb	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	a4724453-124c-45a3-a8c5-db01560300cc	mention	9f6b64dc-aa4b-4405-bd8e-c949afd79260	\N	te mencionó: "@Michelle Ramirez  Oye no tentiendo algo"	t	2026-04-24 13:29:27.945852+00
69f4369c-5505-4d71-968d-758fe05fa3ff	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	a4724453-124c-45a3-a8c5-db01560300cc	mention	95d6f892-272d-4772-b046-11ae106b031e	\N	te mencionó: "@Michelle Ramirez  holi esto es una prueba de las notificaci…"	t	2026-04-22 17:26:19.424381+00
9f3cd517-c9c2-4ec6-8756-0578a7fc2a9e	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	mention	2b59fce0-ce58-4ac6-943d-f8668ef0b278	\N	te mencionó: "@Daniel Galicia  revisada"	f	2026-04-27 16:50:21.093917+00
d27f2433-c37e-4de7-bb8d-e97e938407ad	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	mention	71219edf-b294-40b5-9a9d-aef242f0d311	\N	te mencionó: "@Daniel Galicia  Etsa implementacion no se  llevo a cabo deb…"	f	2026-05-01 16:15:58.643624+00
c295a371-432b-4488-a256-55dc414496a3	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	mention	c321378a-a64c-4d29-9db8-3bd8eb5e0557	\N	te mencionó: "@Daniel Galicia Esta implementacion no se llevo a cabo debid…"	f	2026-05-01 16:17:00.688571+00
8f563aa1-2a2b-4fe0-8502-18b89709dbc1	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	mention	fe502370-1edd-4952-b738-49fcc8d13fd2	\N	te mencionó: "@Daniel Galicia Esta implementacion no se llevo a cabo debid…"	f	2026-05-01 16:17:12.675242+00
f83be742-81b3-4f65-829f-8a64eec580a3	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	mention	de9b2e3e-788e-485f-bb54-67880a1aec03	\N	te mencionó: "Se tiene que borrar esta tareas @Daniel Galicia"	f	2026-05-01 16:18:51.079195+00
cf48668c-c07d-49d4-85b4-a4b97c49067e	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	a4724453-124c-45a3-a8c5-db01560300cc	mention	39e7b44c-eac7-4504-8fe4-26f67e2ed45c	\N	te mencionó: "@Michelle Ramirez Intenta replicarlo de nuevo por fis"	t	2026-04-30 18:54:18.967848+00
22f80995-7da8-437c-94ab-a0d526a9f145	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	a4724453-124c-45a3-a8c5-db01560300cc	mention	5ce47d36-19a0-40cd-9dc3-7f342f3e8593	\N	te mencionó: "@Michelle Ramirez No me acuerdo como se eliminan xd"	t	2026-04-30 17:58:56.363653+00
d8086342-8a61-417e-8a75-c157ec8ae699	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	mention	7852e7ae-9ca7-4df6-a549-5ac6272ea334	\N	te mencionó: "Eliminar @Daniel Galicia"	f	2026-05-01 17:04:43.320112+00
\.


--
-- Data for Name: project_members; Type: TABLE DATA; Schema: public; Owner: rxcode_dba
--

COPY public.project_members (project_id, user_id, role) FROM stdin;
725a2211-9531-466d-ba0b-1df66ef0e70c	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	member
f510a515-f9b5-41d2-ae13-288afe2ae69f	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	member
37beb68d-3baf-4a1b-8d51-3e1b6539140f	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	member
027fa9f0-f03f-4c18-970c-9374bace6e5b	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	member
bab1aa48-dc68-4165-8847-30e240091641	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	member
a092bc84-7294-4ce0-9261-d410e04c0359	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	member
fedd8755-1935-4c0a-aefb-41dcf3ece4ef	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	member
d24e523f-8e3e-46e1-be30-f8271ceb610c	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	member
4f13a9e6-930d-45e8-9f68-acccef604a9d	a4724453-124c-45a3-a8c5-db01560300cc	member
c70b1f17-d0d0-4706-b77c-97ed59c954d5	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	member
2b3e7ea3-1d8c-40c8-949f-542542aac626	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	member
465c5160-21c0-4ea0-82b8-71cd32fcd21d	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	owner
13c4e56a-fc1e-4f80-9a19-ba68f3f5379d	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	owner
8293a962-1901-46bb-9ab6-bb151126376b	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	owner
abf11801-76cd-496c-b30c-df03410c0af8	60ce5ac5-9ee2-427d-98c5-f7ef2ee556f3	owner
2ea5d18d-0cd2-4235-8fa8-515a7bd5541e	60ce5ac5-9ee2-427d-98c5-f7ef2ee556f3	owner
0a335258-4581-4b16-a561-c5b7bc4d5609	60ce5ac5-9ee2-427d-98c5-f7ef2ee556f3	owner
1bc9d6ed-9dd4-4e6e-b360-244b415b818f	60ce5ac5-9ee2-427d-98c5-f7ef2ee556f3	owner
\.


--
-- Data for Name: project_task_sequences; Type: TABLE DATA; Schema: public; Owner: rxcode_dba
--

COPY public.project_task_sequences (project_id, last_seq) FROM stdin;
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: rxcode_dba
--

COPY public.projects (id, code, name, description, created_by, created_at, updated_at, extra_views, methodology, status) FROM stdin;
725a2211-9531-466d-ba0b-1df66ef0e70c	FTL	Futool e-comerce	e-comerce	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22 13:21:18.449334+00	2026-04-22 13:21:18.449334+00	[]	kanban	activo
f510a515-f9b5-41d2-ae13-288afe2ae69f	KNG	Kingden Facturacion	Facturacion	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22 13:23:56.825743+00	2026-04-22 13:23:56.825743+00	[]	kanban	activo
37beb68d-3baf-4a1b-8d51-3e1b6539140f	KNGS	Kingden Sitio de Proveedores	Sitio de proveedores	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22 13:26:07.436547+00	2026-04-22 13:26:07.436547+00	[]	kanban	activo
027fa9f0-f03f-4c18-970c-9374bace6e5b	RYS	RIFASYIN-YANG Sitio	Sitio web	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22 13:27:27.609816+00	2026-04-22 13:27:27.609816+00	[]	kanban	activo
bab1aa48-dc68-4165-8847-30e240091641	RCT	RecTrack Sitio web	Sitio web	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22 13:28:24.186495+00	2026-04-22 13:28:24.186495+00	[]	kanban	activo
a092bc84-7294-4ce0-9261-d410e04c0359	RCTT	RecTrack CRM	CRM	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22 13:29:48.772154+00	2026-04-22 13:29:48.772154+00	[]	kanban	activo
fedd8755-1935-4c0a-aefb-41dcf3ece4ef	RXF	Rxflow	Plataforma de gestion de proyectos	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22 13:40:33.959657+00	2026-04-22 13:40:33.959657+00	[]	kanban	activo
d24e523f-8e3e-46e1-be30-f8271ceb610c	MVP	MVP Aplicacion de panaderia	Aplicacion de panderia	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22 13:43:23.44298+00	2026-04-22 13:43:23.44298+00	[]	kanban	activo
4f13a9e6-930d-45e8-9f68-acccef604a9d	WPA	Web Panel de Administración de Sitios Estáticos	Panel para administrar sitios web estáticos: contenido, colores y logos vía proxy REST.	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-24 16:37:14.653725+00	2026-04-24 16:38:03.340197+00	[]	kanban	activo
c70b1f17-d0d0-4706-b77c-97ed59c954d5	RXC	Rxcode Sitio web	Sitio para la consultoria	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-27 16:47:34.832532+00	2026-04-27 16:47:34.832532+00	[]	kanban	activo
2b3e7ea3-1d8c-40c8-949f-542542aac626	RXFC	RxFinance	Aplicacion de gestion financiera	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-28 16:55:37.69888+00	2026-04-28 16:55:37.69888+00	[]	kanban	activo
465c5160-21c0-4ea0-82b8-71cd32fcd21d	RXCL	Rxcloud	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-05-01 16:53:03.139627+00	2026-05-01 16:53:03.139627+00	[]	scrum	activo
13c4e56a-fc1e-4f80-9a19-ba68f3f5379d	REC	Recovery&Hardaware	Sitio web para negocio de computadoras	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-05-04 15:39:55.993107+00	2026-05-04 15:39:55.993107+00	[]	scrum	activo
8293a962-1901-46bb-9ab6-bb151126376b	RXL	Rx-letter-food	Sistema menu para restaurantes y negocios de ramo alimenticio	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-05-04 15:43:08.346357+00	2026-05-04 15:43:08.346357+00	[]	scrum	activo
abf11801-76cd-496c-b30c-df03410c0af8	CFE	CFE	Instalacion de Multifuncionales Lexmark	60ce5ac5-9ee2-427d-98c5-f7ef2ee556f3	2026-05-06 15:12:53.766421+00	2026-05-06 15:12:53.766421+00	[]	scrum	activo
2ea5d18d-0cd2-4235-8fa8-515a7bd5541e	RCTS	R&H CCTV Tienda Suc63	Instalar camara adicional en bodega por motivo de control de perdidas	60ce5ac5-9ee2-427d-98c5-f7ef2ee556f3	2026-05-06 21:55:06.147578+00	2026-05-06 21:55:06.147578+00	[]	scrum	activo
0a335258-4581-4b16-a561-c5b7bc4d5609	RRC	Raul Rangel CCTV	camaras 4k	60ce5ac5-9ee2-427d-98c5-f7ef2ee556f3	2026-05-07 13:27:04.036304+00	2026-05-07 13:27:04.036304+00	[]	scrum	activo
1bc9d6ed-9dd4-4e6e-b360-244b415b818f	RH	Recovery & Hardware	Empresa De gestion de tecnologias de la informacion, CCTV, Mantenimiento Industrial , Energia y electricidad, Audio car e Inmobiliaria	60ce5ac5-9ee2-427d-98c5-f7ef2ee556f3	2026-05-07 13:35:08.085862+00	2026-05-07 13:35:08.085862+00	[]	scrum	activo
\.


--
-- Data for Name: task_labels; Type: TABLE DATA; Schema: public; Owner: rxcode_dba
--

COPY public.task_labels (task_id, label_id) FROM stdin;
\.


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: rxcode_dba
--

COPY public.tasks (id, sequential_id, project_id, epic_id, cycle_id, parent_task_id, title, description, status, priority, assignee_id, created_by, due_date, completed_at, blocked_reason, "position", created_at, updated_at) FROM stdin;
7092821f-73b6-4053-a0b1-26b61507d553	42	4f13a9e6-930d-45e8-9f68-acccef604a9d	5ea59ed3-ed6d-4b0c-966b-28b48d18370f	c8658228-e47d-48d8-8527-3530eadd5618	\N	Redirección a /dashboard tras login exitoso (next/navigation redirect)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-06	\N	\N	0	2026-04-24 16:37:19.230722+00	2026-05-01 17:21:46.097308+00
7e83c67d-10b4-49e9-8c8b-964a3f3626a5	43	4f13a9e6-930d-45e8-9f68-acccef604a9d	5ea59ed3-ed6d-4b0c-966b-28b48d18370f	c8658228-e47d-48d8-8527-3530eadd5618	\N	Estados visuales en login: loader en botón y mensaje de error inline (isLoading + errorMessage)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-06	\N	\N	0	2026-04-24 16:37:19.275387+00	2026-05-01 17:21:46.097308+00
05fb9ccf-20ef-40f2-ab07-bac3f26c4770	2	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	63321493-29ca-487f-9ee7-55ac71060545	\N	\N	Crear tareas para Rxflow	\N	completada	alta	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-22	\N	\N	0	2026-04-22 13:46:28.442894+00	2026-04-27 17:02:36.204158+00
a1ceb92b-7d63-469a-946b-5d2c00998739	8	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	32659c70-ccc3-4f0d-b444-759e14237e01	\N	\N	Mejorar vista y funciones [Vista de tarea individual]	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-22	\N	\N	0	2026-04-22 14:35:02.658937+00	2026-04-23 14:48:55.221121+00
0c2fc291-7a14-4376-b254-c952d3b780d9	6	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	32659c70-ccc3-4f0d-b444-759e14237e01	\N	\N	Crear logica de Mis tareas	\N	completada	alta	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-22	\N	\N	0	2026-04-22 14:20:51.206385+00	2026-04-23 14:48:58.080984+00
554750c0-6ba6-499d-993e-2fd1c2d7fffe	5	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	32659c70-ccc3-4f0d-b444-759e14237e01	\N	\N	Al momento de crear, editar areas se tiene que actualizar las vistas[board,epica,backlog]	\N	completada	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 14:04:01.571336+00	2026-04-23 14:49:02.496287+00
95d6f892-272d-4772-b046-11ae106b031e	3	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	32659c70-ccc3-4f0d-b444-759e14237e01	01375b73-d0af-4d2c-aa46-f35322c9cb3a	\N	Menu de epicas poder  eliminar, editar cada epica	\N	completada	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 13:49:41.890508+00	2026-04-23 14:49:07.608605+00
942cb1dc-029b-4964-b97e-07eb9ecb141e	2	027fa9f0-f03f-4c18-970c-9374bace6e5b	8b63a83a-965c-4f06-a057-fd7bce03639c	\N	6c1a4842-e874-4bcb-a6d7-78ea99cc92fe	Conexión técnica del sitio con la API de Google Cloud Console.	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:19:07.659999+00	2026-04-22 15:19:07.659999+00
21057123-2b83-479f-9fe2-1922ea2a3c90	3	027fa9f0-f03f-4c18-970c-9374bace6e5b	8b63a83a-965c-4f06-a057-fd7bce03639c	\N	6c1a4842-e874-4bcb-a6d7-78ea99cc92fe	Implementación de lógica de lectura/escritura para actualización bidireccional de datos.	\N	backlog	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:19:53.997261+00	2026-04-22 15:19:53.997261+00
d51902b5-dd55-42a0-aa8d-302dfd494fb9	4	027fa9f0-f03f-4c18-970c-9374bace6e5b	8b63a83a-965c-4f06-a057-fd7bce03639c	\N	6c1a4842-e874-4bcb-a6d7-78ea99cc92fe	Pruebas de estrés y validación de flujo de datos entre el sitio y la hoja de cálculo.	\N	backlog	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:20:31.327131+00	2026-04-22 15:20:31.327131+00
6c1a4842-e874-4bcb-a6d7-78ea99cc92fe	1	027fa9f0-f03f-4c18-970c-9374bace6e5b	8b63a83a-965c-4f06-a057-fd7bce03639c	2214bbdc-0d38-4789-9fac-6e218824478c	\N	Conexión técnica del sitio con la API de Google Cloud Console.	\N	completada	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:15:23.221952+00	2026-05-01 16:11:53.010843+00
53b3b2c3-76b9-45f1-be9d-c59237409a8a	5	027fa9f0-f03f-4c18-970c-9374bace6e5b	8b63a83a-965c-4f06-a057-fd7bce03639c	2214bbdc-0d38-4789-9fac-6e218824478c	\N	Implementación de lógica de lectura/escritura para actualización bidireccional de datos.	\N	completada	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:21:11.672474+00	2026-05-01 16:11:59.635333+00
56ac4ab3-6acf-4abc-8712-7efeba22a56e	6	027fa9f0-f03f-4c18-970c-9374bace6e5b	8b63a83a-965c-4f06-a057-fd7bce03639c	2214bbdc-0d38-4789-9fac-6e218824478c	\N	Pruebas de estrés y validación de flujo de datos entre el sitio y la hoja de cálculo.	\N	completada	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:33:26.224229+00	2026-05-01 16:12:04.436864+00
083365e5-d8cf-4d29-8467-15bd8fd63a92	7	027fa9f0-f03f-4c18-970c-9374bace6e5b	8b63a83a-965c-4f06-a057-fd7bce03639c	28979da5-bd3e-4a36-b586-dfac82c39485	\N	Gestión de registro y alta de cuenta del cliente en la plataforma de pagos.	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:37:50.94013+00	2026-05-01 16:12:41.047758+00
dd2e73d4-fb49-49c7-85fb-fab309a4572e	8	027fa9f0-f03f-4c18-970c-9374bace6e5b	8b63a83a-965c-4f06-a057-fd7bce03639c	28979da5-bd3e-4a36-b586-dfac82c39485	\N	Integración vía API/SDK de la pasarela dentro del flujo de checkout del sitio.	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:38:12.325221+00	2026-05-01 16:12:43.691035+00
2529b415-6573-4916-959e-e9448e68ba7a	9	027fa9f0-f03f-4c18-970c-9374bace6e5b	8b63a83a-965c-4f06-a057-fd7bce03639c	28979da5-bd3e-4a36-b586-dfac82c39485	\N	Ejecución de pruebas en modo sandbox y producción para confirmar transacciones.	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:38:52.860951+00	2026-05-01 16:12:50.509791+00
e809428d-7639-4805-89eb-aa44062919ee	13	027fa9f0-f03f-4c18-970c-9374bace6e5b	dd936700-73c0-49a4-b0ab-c531a0696d44	bf3d64d3-b4fe-41b5-a8ff-c20d1b89bc7f	\N	Desarrollo de lógica para selección manual de números desde la interfaz.	\N	completada	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:45:37.298614+00	2026-05-01 16:12:54.250741+00
93609532-f511-43cc-9125-331da6b7eb0a	14	027fa9f0-f03f-4c18-970c-9374bace6e5b	dd936700-73c0-49a4-b0ab-c531a0696d44	bf3d64d3-b4fe-41b5-a8ff-c20d1b89bc7f	\N	Desarrollo de algoritmo para asignación aleatoria de números (Quick Pick).	\N	completada	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:45:55.725471+00	2026-05-01 16:12:58.378644+00
05fe4b7a-4072-40f4-8b9d-2f2dbe5afdb3	15	027fa9f0-f03f-4c18-970c-9374bace6e5b	dd936700-73c0-49a4-b0ab-c531a0696d44	665d22bc-65e4-4d44-bfc1-ea14560da771	\N	Interfaz de consulta de estado del boleto y visualización de abonos realizados.	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:48:44.293591+00	2026-05-01 16:13:02.045229+00
09746ccd-54fc-4004-85e8-f4cc70e445bb	16	027fa9f0-f03f-4c18-970c-9374bace6e5b	dd936700-73c0-49a4-b0ab-c531a0696d44	665d22bc-65e4-4d44-bfc1-ea14560da771	\N	Implementación de formulario de carga de archivos para comprobantes de transferencia.	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:49:01.440544+00	2026-05-01 16:13:05.222027+00
3ea91c2a-2ce2-4a46-8264-9fdb3f9844b6	17	027fa9f0-f03f-4c18-970c-9374bace6e5b	dd936700-73c0-49a4-b0ab-c531a0696d44	665d22bc-65e4-4d44-bfc1-ea14560da771	\N	Configuración de avisos legales y tiempos de espera (letrero de verificación manual 24 hrs).	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:49:15.615769+00	2026-05-01 16:13:08.732085+00
1811323d-878b-4af3-8aa2-b92d575781fd	18	027fa9f0-f03f-4c18-970c-9374bace6e5b	dd936700-73c0-49a4-b0ab-c531a0696d44	3057c16c-24fb-42e4-95c7-eed1e6ae0f3f	\N	Filtro de seguridad para visualización pública (mostrar solo número y nombre, ocultar datos sensibles).	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:50:54.836645+00	2026-05-01 16:13:14.369707+00
2e42270d-5596-4ef7-9b38-e4dca8500c01	20	027fa9f0-f03f-4c18-970c-9374bace6e5b	dd936700-73c0-49a4-b0ab-c531a0696d44	7fa540ec-8b1b-423e-9266-f0f74bf77ac4	\N	Formulario de registro de información personal obligatorio previo al apartado.	\N	completada	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:52:42.426121+00	2026-05-01 16:13:20.47905+00
d5cd5893-6bcf-4d39-9f44-131fcec88d8b	21	027fa9f0-f03f-4c18-970c-9374bace6e5b	9dc22c5e-c35a-4a44-a761-fd3ac0a0b1df	70e20724-3924-4d83-b3da-2190c868dd3e	\N	Maquetación de sección de contacto con botones/iconos de Facebook y WhatsApp Channel.	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:58:07.876108+00	2026-05-01 16:13:23.698711+00
58d56a52-e36b-4aca-9ca1-d623f82c12df	22	027fa9f0-f03f-4c18-970c-9374bace6e5b	9dc22c5e-c35a-4a44-a761-fd3ac0a0b1df	70e20724-3924-4d83-b3da-2190c868dd3e	\N	Implementación del botón flotante de contacto directo vía WhatsApp.	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:58:25.619627+00	2026-05-01 16:13:26.821181+00
76eab628-2c37-4480-83ce-87540f534c98	24	027fa9f0-f03f-4c18-970c-9374bace6e5b	666ce9bf-453e-4b78-b3c5-78bd2e9b145f	618ff6cb-9f39-4f13-b3d1-60ad1cbc3489	\N	Animación de estados en los números (Disponible, Seleccionado, Vendido).	\N	completada	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:01:52.207517+00	2026-05-01 16:13:36.909025+00
56c85c22-dcaa-4de0-8953-ff2a4688232d	30	027fa9f0-f03f-4c18-970c-9374bace6e5b	737f4b1f-26e1-49ab-9ed9-5d68efb22da6	\N	\N	corregir disposicion en vista en laptop	\N	completada	urgente	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-30	\N	\N	0	2026-04-30 16:10:32.777731+00	2026-05-01 16:13:53.555651+00
71219edf-b294-40b5-9a9d-aef242f0d311	10	027fa9f0-f03f-4c18-970c-9374bace6e5b	8b63a83a-965c-4f06-a057-fd7bce03639c	95ecd6c4-c407-47eb-bddc-7902bcc19012	\N	Gestión de accesos a Meta Business Suite y configuración de método de pago para consumo de mensajes.	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:42:27.2361+00	2026-05-01 16:17:23.681891+00
c321378a-a64c-4d29-9db8-3bd8eb5e0557	11	027fa9f0-f03f-4c18-970c-9374bace6e5b	8b63a83a-965c-4f06-a057-fd7bce03639c	95ecd6c4-c407-47eb-bddc-7902bcc19012	\N	Proceso de verificación de negocio ante Meta (estimado 1-5 días hábiles).	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:43:09.557227+00	2026-05-01 16:17:25.738711+00
fe502370-1edd-4952-b738-49fcc8d13fd2	12	027fa9f0-f03f-4c18-970c-9374bace6e5b	8b63a83a-965c-4f06-a057-fd7bce03639c	95ecd6c4-c407-47eb-bddc-7902bcc19012	\N	Programación del envío automático de mensajes de confirmación tras apartado/venta de boletos.	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:43:23.208442+00	2026-05-01 16:17:27.536112+00
0346c89d-ca4b-44e0-904f-f88f7130cf4d	1	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	32659c70-ccc3-4f0d-b444-759e14237e01	\N	\N	Corregir logica de identifcador	\N	completada	baja	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 13:45:05.916397+00	2026-05-01 16:21:21.465123+00
dc53b585-7322-4dc3-b3d7-e499790507a4	28	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	f5227599-800c-4443-af2b-f217168ac169	\N	\N	corregir  disparidad en fechas de cycles y lo mostrado en la lista de cycles	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-05-01	\N	\N	0	2026-04-30 15:19:32.386247+00	2026-05-01 16:22:42.962279+00
89fc652a-b901-4c19-aed8-f3d3847dbcfc	79	4f13a9e6-930d-45e8-9f68-acccef604a9d	2386ce78-c07a-4ba0-b711-404e5a0acf1c	\N	\N	Instalar Docker Engine y Docker Compose plugin en el VPS Ubuntu 22.04 (agregar usuario al grupo docker)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-14	\N	\N	0	2026-04-24 16:37:20.950231+00	2026-05-01 17:15:28.588523+00
7df852e8-5da4-467b-8abd-d76af283551d	110	4f13a9e6-930d-45e8-9f68-acccef604a9d	dcfbce7f-d25b-4ebf-aa62-e7affa23f0bf	\N	\N	Crear docker de desarrollo [Fronted y backend]	\N	backlog	urgente	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-05-14	\N	\N	0	2026-04-27 17:13:57.371995+00	2026-05-01 17:17:07.08364+00
347c63c8-e661-4d79-8050-4e0074e2af97	45	4f13a9e6-930d-45e8-9f68-acccef604a9d	5ea59ed3-ed6d-4b0c-966b-28b48d18370f	c8658228-e47d-48d8-8527-3530eadd5618	\N	Logout: limpiar store + POST /auth/logout + redirect /login	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-06	\N	\N	0	2026-04-24 16:37:19.361313+00	2026-05-01 17:21:46.097308+00
5c2aa768-e9cd-4027-a2de-c5924c076e62	17	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	32659c70-ccc3-4f0d-b444-759e14237e01	\N	\N	Tiene que reflejarse en las epicas cuando se cambie el estatus de una tarea	\N	en_revision	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-30	\N	\N	0	2026-04-27 16:56:23.206738+00	2026-05-02 17:07:03.424963+00
92ac821f-23f1-4a3d-89af-ee3392848ffb	17	725a2211-9531-466d-ba0b-1df66ef0e70c	43ea57f7-ae68-4f98-93d6-b8e4986dc948	2831a07f-27e3-46b3-bd27-13403a879dc0	\N	Evaluar el envío de iconos personalizados con plasta de color para integración final.	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:33:57.234667+00	2026-04-27 17:03:32.761252+00
afbdb4f3-6037-4e51-8f11-a8fa49dbc3d7	18	725a2211-9531-466d-ba0b-1df66ef0e70c	43ea57f7-ae68-4f98-93d6-b8e4986dc948	83ef4979-4e00-4ca6-9702-b751651c3af7	\N	Ajustar el tamaño del logo en la sección de pagos según límites de Shopify.	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:34:12.567776+00	2026-04-27 17:03:37.46135+00
52ae1014-6278-45f9-9d6f-99519d98d948	19	725a2211-9531-466d-ba0b-1df66ef0e70c	43ea57f7-ae68-4f98-93d6-b8e4986dc948	27fc5949-bdf4-4347-8744-8f42f9c709fb	\N	Agregar ruta de navegación (Inicio / Maquinaria / Categoría) en productos.	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:34:35.624088+00	2026-04-27 17:03:40.995611+00
99973238-e312-4010-8579-eea4d9368788	20	725a2211-9531-466d-ba0b-1df66ef0e70c	43ea57f7-ae68-4f98-93d6-b8e4986dc948	4b5571c8-26a5-41a1-bcb7-83f191dfade0	\N	Añadir apartado de "Preguntas y Respuestas" en menú y fichas de producto.	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:34:48.817246+00	2026-04-27 17:03:44.710913+00
82eb4e3e-e26f-4c28-87fc-5c083598fefb	21	725a2211-9531-466d-ba0b-1df66ef0e70c	43ea57f7-ae68-4f98-93d6-b8e4986dc948	8eb08010-5c7a-4abd-8ac9-ea5c005c7fd9	\N	Homologar el tamaño de los botones "Agregar al carrito" y "Comprar ahora"	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:35:00.600061+00	2026-04-27 17:03:48.873006+00
2c48409d-0368-49cd-9c90-97ff6c0adfcd	14	725a2211-9531-466d-ba0b-1df66ef0e70c	fe7566e4-5560-4043-a650-8e265b85ec34	b8d718f8-1e71-4de8-994c-c28e2559a99c	\N	Implementación de transiciones de carga y animaciones de entrada (fade-in/slide-up).	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:29:56.396627+00	2026-04-27 17:38:36.026697+00
e42c3b7a-b83d-4b09-bee1-d7880bf4d6ac	15	725a2211-9531-466d-ba0b-1df66ef0e70c	fe7566e4-5560-4043-a650-8e265b85ec34	4be47c45-1e37-45f5-8331-d72e01358b4a	\N	Gestión de dominio, redirecciones y certificados SSL/TLS en Shopify.	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:30:11.95554+00	2026-04-27 17:38:39.671951+00
09ea37ca-4f6c-408a-ba44-1104394a72af	11	725a2211-9531-466d-ba0b-1df66ef0e70c	2b397aa2-0963-44ec-b095-9385aa21a82f	056ed57b-ec7a-4af4-8d47-080513e70faa	\N	Interfaz alineada a las referencias visuales proporcionadas por Futool.	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:26:06.170386+00	2026-04-27 17:38:46.605437+00
b8753dc0-3e79-4a59-8fb8-03da46c3e71c	12	725a2211-9531-466d-ba0b-1df66ef0e70c	2b397aa2-0963-44ec-b095-9385aa21a82f	10bad6ed-f8a3-466f-9ee7-958b19860a2e	\N	Configuración de padding, botones de WhatsApp y productos destacados.	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:26:20.612801+00	2026-04-27 17:38:51.87797+00
79eb18bf-c400-4793-a0f4-b69472063018	1	725a2211-9531-466d-ba0b-1df66ef0e70c	7edb86b7-7239-4712-a80b-1cf35bbd37de	18dde9e5-8613-4476-8997-0dd12ae2964b	\N	Maquetación y estructura del sitio desarrollada desde cero en Shopify.	\N	completada	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:10:56.979078+00	2026-04-27 17:39:10.965943+00
cdefccba-fe54-42c9-a428-de29a0a7fcf5	5	725a2211-9531-466d-ba0b-1df66ef0e70c	7edb86b7-7239-4712-a80b-1cf35bbd37de	262de254-d31f-4532-b28f-68f6a98c93f8	\N	Organización y estructuración de datos de contacto según propuesta de RecTrack.	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:13:08.427644+00	2026-04-27 17:39:19.959787+00
d289640b-91d8-4e00-a214-87f5dd556c81	2	725a2211-9531-466d-ba0b-1df66ef0e70c	7edb86b7-7239-4712-a80b-1cf35bbd37de	0ea60d15-77b5-4ef6-b701-e3d897bba707	\N	Implementación de sistema de catálogos descargables en formato PDF.	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:12:25.617645+00	2026-04-27 17:39:27.198417+00
b36767be-07c0-41ea-b37f-5cbb410ea14e	3	725a2211-9531-466d-ba0b-1df66ef0e70c	7edb86b7-7239-4712-a80b-1cf35bbd37de	96fdcb74-de66-4ae5-b1f0-79f459192526	\N	Configuración de banner principal con actualización dinámica de imágenes.	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:12:40.477247+00	2026-04-27 17:39:34.944639+00
fcdfdbab-07bf-45c6-9633-2d18cb248a2a	4	725a2211-9531-466d-ba0b-1df66ef0e70c	7edb86b7-7239-4712-a80b-1cf35bbd37de	262de254-d31f-4532-b28f-68f6a98c93f8	\N	Sustitución de cards por imágenes fijas para la exhibición de productos.	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:12:52.987226+00	2026-04-27 17:39:41.150882+00
3e5a2d93-adbe-4906-9975-b60bdad267d4	6	725a2211-9531-466d-ba0b-1df66ef0e70c	d00cd5db-49bd-4ab4-8a31-c047660571f7	f6c4ce13-a96d-4431-94d2-2b5d83e2bdb3	\N	Vinculación activa con el convenio directo del cliente.	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:17:04.519355+00	2026-04-27 17:39:55.960694+00
35558b66-b4f5-4a4b-8640-fa8aabc670c8	9	725a2211-9531-466d-ba0b-1df66ef0e70c	d00cd5db-49bd-4ab4-8a31-c047660571f7	cdaf7e2a-abc7-45cd-b262-ec35e66244ce	\N	Integración de OpenPay como pasarela de pago alternativa.	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:17:43.861269+00	2026-04-27 17:40:05.352763+00
681adb9e-54c7-433c-8d02-53ea6ff0fafd	8	725a2211-9531-466d-ba0b-1df66ef0e70c	d00cd5db-49bd-4ab4-8a31-c047660571f7	cbe55d82-7c43-4a23-a5c4-845186505bcf	\N	Integración de Mercado Pago como procesador transaccional.	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:17:28.7616+00	2026-04-27 17:40:14.989521+00
0ba3638a-055f-4260-85f4-db1227abcf5a	7	725a2211-9531-466d-ba0b-1df66ef0e70c	d00cd5db-49bd-4ab4-8a31-c047660571f7	\N	\N	Integración de plataforma Envia.com para gestión de envíos.	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:17:16.466297+00	2026-04-27 17:40:21.771245+00
5b00bebb-3602-43a8-a391-8153b0484248	22	725a2211-9531-466d-ba0b-1df66ef0e70c	8508f132-e1f8-4b2a-ac66-14d58453b09b	2a688f53-df8e-46f2-bc3b-8ba63623af9f	\N	Retirar Shop Pay y G Pay; dejar únicamente OpenPay y Mercado Pago.	\N	completada	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:44:17.637541+00	2026-04-27 17:40:35.504802+00
dc2ee7ba-52e0-4cd6-a821-47d5752dd19d	23	725a2211-9531-466d-ba0b-1df66ef0e70c	8508f132-e1f8-4b2a-ac66-14d58453b09b	29e0fae3-011b-43fd-9060-4f639e436702	\N	Eliminar el apartado de facturación y la leyenda de "Pago exprés".	\N	completada	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:44:31.500011+00	2026-04-27 17:40:45.80984+00
58812dc3-dec3-4161-b500-17b0819cbf25	24	725a2211-9531-466d-ba0b-1df66ef0e70c	8508f132-e1f8-4b2a-ac66-14d58453b09b	af21299f-55c2-48cc-93ef-b5a14d3a9b26	\N	Ajustar el catálogo para mostrar solo Futool, Palezzi y Kawano	\N	completada	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:44:44.887228+00	2026-04-27 17:40:53.168767+00
a33d939e-94b5-4533-baf6-23d2b6cfafad	25	725a2211-9531-466d-ba0b-1df66ef0e70c	8508f132-e1f8-4b2a-ac66-14d58453b09b	f743b2db-8d13-4cf8-8297-67cadad4373d	\N	Modificar y validar los números telefónicos correctos en el sitio	\N	completada	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:45:04.070416+00	2026-04-27 17:41:00.438777+00
9f6b64dc-aa4b-4405-bd8e-c949afd79260	28	725a2211-9531-466d-ba0b-1df66ef0e70c	8508f132-e1f8-4b2a-ac66-14d58453b09b	6a699ad4-89f0-4fbb-865d-9f8daede805a	\N	Corregir errores tipográficos, incluyendo el uso de "v" minúscula en correo	\N	completada	urgente	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:46:16.158209+00	2026-04-27 17:41:12.139324+00
2d5d6bdb-069d-4fcf-8017-b329827a4c1a	27	725a2211-9531-466d-ba0b-1df66ef0e70c	8508f132-e1f8-4b2a-ac66-14d58453b09b	b52d554a-f271-4f88-9a30-9b88980d6c9f	\N	Ajustar el degradado a blanco para que se una visualmente a "Recomendados".	\N	completada	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:45:30.364266+00	2026-04-27 17:41:19.268087+00
29707c0b-8be6-447f-b644-103e6d292c8d	26	725a2211-9531-466d-ba0b-1df66ef0e70c	8508f132-e1f8-4b2a-ac66-14d58453b09b	d98501a2-81ee-4e5f-a6bf-0daa8ab82755	\N	Completar las categorías faltantes en Maquinaria y Refacciones.	\N	completada	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:45:16.467276+00	2026-04-27 17:41:28.461637+00
c2d71931-6f3f-4555-a2d5-8768d794fa7c	10	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	32659c70-ccc3-4f0d-b444-759e14237e01	\N	\N	Corregir logica de bandeja de  notificaciones	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-15	\N	\N	0	2026-04-22 17:45:59.722471+00	2026-04-22 17:45:59.722471+00
ccdf4154-7cfd-44c7-8148-352967d8592c	22	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	756e6bde-eeea-47c4-91e3-e7d8381caaa2	\N	\N	Mover la logica de los cycles por proyecto	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-28	\N	\N	0	2026-04-28 16:18:16.780649+00	2026-04-28 16:18:16.780649+00
de9b2e3e-788e-485f-bb54-67880a1aec03	10	725a2211-9531-466d-ba0b-1df66ef0e70c	d00cd5db-49bd-4ab4-8a31-c047660571f7	c33e4d33-fa76-4bb3-962b-86588f6194d3	\N	No definida por el cliente; fuera del alcance de este folio.	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:18:17.004186+00	2026-05-01 16:19:03.005282+00
7405ab2f-a69f-4f8b-8183-33c7f98c9393	16	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	32659c70-ccc3-4f0d-b444-759e14237e01	\N	\N	Asignar a mas personas a una tarea	\N	en_progreso	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-05-01	\N	\N	0	2026-04-27 16:51:37.960354+00	2026-05-01 16:21:41.832823+00
f9d006e4-72e5-4fa9-93bf-a91e955c23e7	81	4f13a9e6-930d-45e8-9f68-acccef604a9d	2386ce78-c07a-4ba0-b711-404e5a0acf1c	\N	\N	Instalar Certbot y obtener certificado SSL con Let's Encrypt (certbot --nginx, configurar autorenovación)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-14	\N	\N	0	2026-04-24 16:37:21.054501+00	2026-05-01 17:15:38.181769+00
2340fef4-2f94-4b14-a1fc-88547b2ea64c	2	bab1aa48-dc68-4165-8847-30e240091641	56ec65b0-f6d9-46c0-99eb-8f02ea4cd26c	\N	\N	Hacer un hero	\N	backlog	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-28	\N	\N	0	2026-04-27 17:18:01.061329+00	2026-04-27 17:18:01.061329+00
4a3071dc-85a5-4258-988f-78b6b3367c2b	3	bab1aa48-dc68-4165-8847-30e240091641	f42f1212-3e8d-40a7-bbcc-3556db92d742	\N	\N	Hacer un hero	\N	backlog	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-05-01	\N	\N	0	2026-04-27 17:18:27.948996+00	2026-04-27 17:18:27.948996+00
eb048489-cd67-4542-aaf5-d9c191de2418	84	4f13a9e6-930d-45e8-9f68-acccef604a9d	dcfbce7f-d25b-4ebf-aa62-e7affa23f0bf	\N	\N	requirements.txt con versiones pinneadas (fastapi, uvicorn, sqlalchemy[asyncio], asyncpg, alembic, passlib, python-jose, httpx, cryptography, pydantic-settings)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-14	\N	\N	0	2026-04-24 16:37:21.187493+00	2026-05-01 17:16:15.347499+00
bbfbb3d6-844f-4a15-a55f-74023eab34cd	19	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	756e6bde-eeea-47c4-91e3-e7d8381caaa2	\N	\N	Poder agregar descripcion a las tareas	En el formulario de las tareas poder agregar descripcion de las tareas directamente	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-29	\N	\N	0	2026-04-27 17:23:20.93498+00	2026-04-27 17:24:35.437762+00
9aa845ea-5735-4b84-aad3-8828e9a00f48	12	bab1aa48-dc68-4165-8847-30e240091641	7c045a8a-a875-4eb8-a750-16e56c287315	\N	\N	Definir stack	Elegir que opcion usar entre hacerlo vanilla o usar los siguientes freamworks \nnest.js\nnext.js	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-27	\N	\N	0	2026-04-27 17:28:20.953514+00	2026-04-27 17:31:42.154866+00
4832ef7f-b72b-4802-802b-01196914a35b	13	725a2211-9531-466d-ba0b-1df66ef0e70c	fe7566e4-5560-4043-a650-8e265b85ec34	43fb6f77-d615-46c2-b24b-7be3cd5da718	\N	Adaptabilidad en breakpoints: Móvil (320px+), Tablet (768px+) y Desktop (1200px+).	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:29:12.172952+00	2026-04-27 17:38:31.558546+00
834bc3ec-9916-42d5-992a-a587d790f620	44	4f13a9e6-930d-45e8-9f68-acccef604a9d	5ea59ed3-ed6d-4b0c-966b-28b48d18370f	c8658228-e47d-48d8-8527-3530eadd5618	\N	Interceptor para renovar access_token al recibir 401 — llama POST /auth/refresh y reintenta request original	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-06	\N	\N	0	2026-04-24 16:37:19.319+00	2026-05-01 17:21:46.097308+00
21a23f7b-3d88-4f6f-b9c4-0d7c505cd898	2	d24e523f-8e3e-46e1-be30-f8271ceb610c	8395ccdf-b355-4830-9bce-cfa0529c037b	\N	\N	Mapa de estados del inventario (Normal, Bajo Stock, Agotado).	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	\N	\N	\N	0	2026-04-28 17:22:57.187693+00	2026-04-28 17:22:57.187693+00
f5a61c19-efe5-40f5-8e67-cc3ccdc935b1	3	d24e523f-8e3e-46e1-be30-f8271ceb610c	8395ccdf-b355-4830-9bce-cfa0529c037b	\N	\N	Dashboard de Inventario: Cuadrícula con tarjetas que incluyan: Imagen del pan, Nombre, Categoría y Badge de precio.	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	\N	\N	\N	0	2026-04-28 17:23:15.774779+00	2026-04-28 17:23:15.774779+00
cb1a5a8d-ccb0-4c5e-986f-82ce5aa6bc35	4	d24e523f-8e3e-46e1-be30-f8271ceb610c	8395ccdf-b355-4830-9bce-cfa0529c037b	\N	\N	Diseño de botones "+" y "–" de gran formato (mínimo 44x44px para evitar errores táctiles).	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	\N	\N	\N	0	2026-04-28 17:24:02.368971+00	2026-04-28 17:24:02.368971+00
db7c2d9d-844c-4c2a-94c5-41ec46eaed1b	6	d24e523f-8e3e-46e1-be30-f8271ceb610c	2816c86d-99fc-49bf-942e-cc933765c5e6	\N	\N	Vista de Listado de Insumos: Tabla limpia con campos de unidad de medida (kg, gr, l).	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	\N	\N	\N	0	2026-04-28 17:25:10.75378+00	2026-04-28 17:25:10.75378+00
46557d15-3e24-4848-8106-c5cf1ecf923b	5	d24e523f-8e3e-46e1-be30-f8271ceb610c	2816c86d-99fc-49bf-942e-cc933765c5e6	\N	\N	Flujo de creación de receta (Paso 1: Materia prima -> Paso 2: Cantidades -> Paso 3: Cálculo de costo).	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	\N	\N	\N	0	2026-04-28 17:24:50.233975+00	2026-04-28 17:25:19.742965+00
aa74e314-34eb-443a-89d6-f0ce2389ac54	13	d24e523f-8e3e-46e1-be30-f8271ceb610c	b74e358a-b832-477f-ba69-4e3e46a121ee	\N	\N	Animación de odómetro (conteo ascendente) para el balance final y overlay de celebración (confeti).	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	\N	\N	\N	0	2026-04-28 17:30:04.534416+00	2026-04-28 17:30:04.534416+00
b1028f63-4731-4d6b-8484-22072628c0ea	14	d24e523f-8e3e-46e1-be30-f8271ceb610c	ec5bd7b2-f821-435b-9be9-97aa2b5408c8	\N	\N	* Style Guide: Variables de color (Ocre #HEX, Crema #HEX, Marrón #HEX).	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	\N	\N	\N	0	2026-04-28 17:30:45.537992+00	2026-04-28 17:30:45.537992+00
cdab15b5-82a6-461b-812d-41d556ac0e51	15	d24e523f-8e3e-46e1-be30-f8271ceb610c	ec5bd7b2-f821-435b-9be9-97aa2b5408c8	\N	\N	Biblioteca de Componentes: Master components en Figma para botones, inputs y tarjetas.	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	\N	\N	\N	0	2026-04-28 17:31:01.315273+00	2026-04-28 17:31:01.315273+00
295743f4-f0a7-4c52-a222-2eca7a89accc	16	d24e523f-8e3e-46e1-be30-f8271ceb610c	ec5bd7b2-f821-435b-9be9-97aa2b5408c8	\N	\N	Specs de Exportación: Diseño de la estructura visual del reporte diario para PDF/Excel (Layout de impresión).	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	\N	\N	\N	0	2026-04-28 17:31:14.570986+00	2026-04-28 17:31:14.570986+00
f52d28ea-48f4-4e51-8410-2d17e0bf3d51	30	725a2211-9531-466d-ba0b-1df66ef0e70c	8508f132-e1f8-4b2a-ac66-14d58453b09b	\N	\N	Revisar disparidad en catalogo de productos	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-28	\N	\N	0	2026-04-28 15:31:54.692917+00	2026-04-28 21:59:42.825329+00
94d2a2d3-3dbb-42fb-a6bf-b7521a64b79e	93	4f13a9e6-930d-45e8-9f68-acccef604a9d	087bd354-26a1-4f5f-8f97-8352ff245596	c8658228-e47d-48d8-8527-3530eadd5618	\N	Nginx: location / → proxy_pass http://localhost:3000 (frontend Next.js)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-14	\N	\N	0	2026-04-24 16:37:21.606785+00	2026-05-01 17:21:47.080629+00
271fca9c-4dab-43a3-bc9b-fcb35382d2e5	37	4f13a9e6-930d-45e8-9f68-acccef604a9d	a684048f-e470-463f-ba1b-597ed4337fcc	0f769e60-7558-46fc-a00d-c01b8d262d45	\N	Crear todas las migraciones Alembic en orden (users,  sites, refresh_tokens, password_reset_tokens, change_log)	\N	completada	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-29	\N	\N	0	2026-04-24 16:37:18.975281+00	2026-04-29 07:19:01.609387+00
7f3e6016-c9d6-4d27-a18f-28d2305712fb	27	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	\N	\N	\N	PRUEBAS BORRAR	\N	en_progreso	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	\N	\N	\N	0	2026-04-29 23:04:13.347573+00	2026-04-29 23:04:13.347573+00
19ff9b1e-c680-4ec9-b9d5-7701ea82bdfd	1	abf11801-76cd-496c-b30c-df03410c0af8	\N	\N	\N	Visitar Almacen General el salto	\N	completada	alta	60ce5ac5-9ee2-427d-98c5-f7ef2ee556f3	60ce5ac5-9ee2-427d-98c5-f7ef2ee556f3	2026-05-06	\N	\N	0	2026-05-06 15:13:42.017502+00	2026-05-06 21:50:28.934922+00
a6c8d077-52fb-4630-befd-48f90b8ae62a	4	bab1aa48-dc68-4165-8847-30e240091641	56ec65b0-f6d9-46c0-99eb-8f02ea4cd26c	\N	\N	Generar testimonios	Revisa la referencias y conforme a ello genera un diseño para RecTrack	backlog	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-28	\N	\N	0	2026-04-27 17:20:12.780591+00	2026-04-27 17:21:03.573933+00
5be55158-da37-420f-83a8-1a4a47d9b906	6	bab1aa48-dc68-4165-8847-30e240091641	f42f1212-3e8d-40a7-bbcc-3556db92d742	\N	\N	Generar seccion de marcas con las que ha trabajado	\N	backlog	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-29	\N	\N	0	2026-04-27 17:25:29.894155+00	2026-04-27 17:25:29.894155+00
1218b1d6-3371-4eb6-a292-c256f5a43a06	7	bab1aa48-dc68-4165-8847-30e240091641	56ec65b0-f6d9-46c0-99eb-8f02ea4cd26c	\N	\N	Generar seccion de marcas con las que ha trabajado	\N	backlog	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-29	\N	\N	0	2026-04-27 17:25:39.069165+00	2026-04-27 17:25:39.069165+00
db3f682d-3dc4-4ada-a41c-3d19e72003f0	20	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	756e6bde-eeea-47c4-91e3-e7d8381caaa2	\N	\N	Seccion de horarios	\N	backlog	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-29	\N	\N	0	2026-04-27 17:32:55.757803+00	2026-04-27 17:32:55.757803+00
32c61311-2fdc-4d7c-92c8-b898eca6e50b	28	027fa9f0-f03f-4c18-970c-9374bace6e5b	737f4b1f-26e1-49ab-9ed9-5d68efb22da6	\N	\N	Fix:error en columna en la seccion del panel.	\N	completada	urgente	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-28	\N	\N	0	2026-04-28 15:33:45.91439+00	2026-04-30 16:16:50.528502+00
d4af2f33-4b7d-4419-9b2b-c5f42b3024a6	7	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	63321493-29ca-487f-9ee7-55ac71060545	\N	\N	Crear tareas para RecK Track [Sitio Web]	\N	completada	media	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-22	\N	\N	0	2026-04-22 14:21:47.537543+00	2026-04-28 16:16:07.802705+00
554479ed-5334-4aa4-9400-f0111547ef68	7	d24e523f-8e3e-46e1-be30-f8271ceb610c	2816c86d-99fc-49bf-942e-cc933765c5e6	\N	\N	Calculadora de Lotes: Interfaz con input numérico destacado para "Cantidad de Lote" y visualización clara del "Costo Total vs. Unitario".	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	\N	\N	\N	0	2026-04-28 17:26:00.010036+00	2026-04-28 17:26:00.010036+00
89073a5a-9dd9-4a2e-abc8-9ca943f06e82	8	d24e523f-8e3e-46e1-be30-f8271ceb610c	a48bf78e-3301-46b2-8504-b54a26f0f219	\N	\N	Prototipo de "Un solo toque" (añadir al carrito sin salir de la vista principal).	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	\N	\N	\N	0	2026-04-28 17:26:50.77946+00	2026-04-28 17:26:50.77946+00
4b7ea4fa-e6d3-4633-8d45-fb192cf7d72a	9	d24e523f-8e3e-46e1-be30-f8271ceb610c	a48bf78e-3301-46b2-8504-b54a26f0f219	\N	\N	Panel POS: Diseño de menú digital tipo "Kiosco" con fotos grandes.	Checkout Modal: Selector de métodos de pago (Efectivo, Tarjeta, Transferencia) con campo de "Recibido" y "Cambio" en tipografía de alto contraste.	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	\N	\N	\N	0	2026-04-28 17:27:15.207474+00	2026-04-28 17:27:30.64549+00
dc04cf85-16c7-4a6e-914d-62ca34465ee9	31	027fa9f0-f03f-4c18-970c-9374bace6e5b	290c8e51-271f-4e71-bd74-50826422c1bc	\N	\N	En el formulario de Editar boleto tiene que parecer un apatado donde aparezcan los abonos	permitir agreggar , editar o eliminar abonos	completada	urgente	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-30	\N	\N	0	2026-04-30 16:13:35.031778+00	2026-05-01 16:13:57.040635+00
9c786d70-f5be-4d69-baef-6140b137e815	32	725a2211-9531-466d-ba0b-1df66ef0e70c	1d2baca6-9a8d-4148-a931-1e192acb3788	\N	\N	Boton debajo de boton de catalogo	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-30	\N	\N	0	2026-04-30 16:19:17.161474+00	2026-05-01 16:17:56.737536+00
5ce47d36-19a0-40cd-9dc3-7f342f3e8593	4	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	f5227599-800c-4443-af2b-f217168ac169	\N	\N	Al momento de cerrar un cycles agregar logica para que se cierre la ventana	\N	bloqueado	baja	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 14:00:29.274872+00	2026-05-01 16:22:57.279586+00
8bded009-e9cc-4a89-9046-45782148ce22	26	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	637c9b2d-c7f6-4f0e-bdab-6e76d3650f85	\N	\N	Crear logica de permisos y vista a proyectos asignados	\N	en_progreso	alta	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-28	\N	\N	0	2026-04-28 21:38:17.666745+00	2026-04-28 21:38:17.666745+00
09f83fa4-398c-4790-90e6-c29b971d3d64	36	4f13a9e6-930d-45e8-9f68-acccef604a9d	a684048f-e470-463f-ba1b-597ed4337fcc	0f769e60-7558-46fc-a00d-c01b8d262d45	\N	Configurar SQLAlchemy async engine con asyncpg (DATABASE_URL desde .env, Base declarativa, AsyncSession DI)	\N	completada	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-29	\N	\N	0	2026-04-24 16:37:18.931036+00	2026-04-29 07:18:51.021764+00
f536633f-bf77-4edc-ab47-47e8eb59633b	39	4f13a9e6-930d-45e8-9f68-acccef604a9d	a684048f-e470-463f-ba1b-597ed4337fcc	0f769e60-7558-46fc-a00d-c01b8d262d45	\N	Configurar CORS en FastAPI — aceptar solo FRONTEND_URL desde .env	\N	completada	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-29	\N	\N	0	2026-04-24 16:37:19.095086+00	2026-04-29 07:18:59.273908+00
c0293ab4-2aaf-4219-8453-c25be44557b7	38	4f13a9e6-930d-45e8-9f68-acccef604a9d	a684048f-e470-463f-ba1b-597ed4337fcc	0f769e60-7558-46fc-a00d-c01b8d262d45	\N	Clase Settings con pydantic-settings (DATABASE_URL, SECRET_KEY, FERNET_KEY, token expiry, sin hardcoding)	\N	completada	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-29	\N	\N	0	2026-04-24 16:37:19.018526+00	2026-04-29 07:19:03.51477+00
99eda663-28e8-47a8-907e-6504640bf583	94	4f13a9e6-930d-45e8-9f68-acccef604a9d	087bd354-26a1-4f5f-8f97-8352ff245596	c8658228-e47d-48d8-8527-3530eadd5618	\N	Nginx: location /api/ → proxy_pass http://localhost:8000/ (strip prefijo /api/)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-14	\N	\N	0	2026-04-24 16:37:21.654276+00	2026-05-01 17:21:47.080629+00
12f9c9b7-8ac6-47d6-8ed6-692aac79ed2b	4	4f13a9e6-930d-45e8-9f68-acccef604a9d	65a1cc5d-ab90-4bfb-aaac-8fa1500769c4	\N	\N	POST /auth/login — autenticar y emitir JWT (access_token 30 min + refresh_token 7 días, persiste refresh en BD)	\N	completada	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-04	\N	\N	0	2026-04-24 16:37:17.227318+00	2026-05-02 00:38:08.246327+00
0d59c073-d693-43ca-a514-8617a1efcccc	24	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	756e6bde-eeea-47c4-91e3-e7d8381caaa2	\N	\N	Cambiar vistas de la seccion de mis tareas, agregar nuevas	agregar una vsto tipo kangban, tipo calendario y tipo cuadro	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-28	\N	\N	0	2026-04-28 16:28:15.972678+00	2026-04-30 17:58:06.201958+00
4e2e4bde-9ff4-41e9-8b96-402b95bd87ed	1	4f13a9e6-930d-45e8-9f68-acccef604a9d	65a1cc5d-ab90-4bfb-aaac-8fa1500769c4	\N	\N	Definir modelo SQLAlchemy User (id UUID, email, username, hashed_password, role admin/viewer, is_active, timestamps)	\N	completada	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-04	\N	\N	0	2026-04-24 16:37:17.090977+00	2026-04-29 23:48:32.742748+00
3aad96d9-b9a3-4cdd-b005-5324817e53ba	23	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	756e6bde-eeea-47c4-91e3-e7d8381caaa2	\N	\N	cambiar vista de inicio a un backlog con un filtro por proyecto	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-28	\N	\N	0	2026-04-28 16:27:53.154936+00	2026-04-30 17:58:10.102344+00
66698ec4-f6af-46e2-853d-c0222e93d254	5	4f13a9e6-930d-45e8-9f68-acccef604a9d	65a1cc5d-ab90-4bfb-aaac-8fa1500769c4	\N	\N	POST /auth/refresh — renovar access_token sin rotar refresh_token	\N	completada	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-04	\N	\N	0	2026-04-24 16:37:17.27496+00	2026-05-02 00:38:19.474825+00
ac92724b-3ed1-412e-8472-e6f7684a5595	11	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	32659c70-ccc3-4f0d-b444-759e14237e01	\N	\N	Corregir bug en epicas de panel de administracion	Cuando agregas la epica como tarea padre es cuando deparece la epica	completada	urgente	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 13:36:22.790783+00	2026-04-23 17:34:38.119845+00
1aed1bc6-6adb-4fbf-9531-d9bde0abdc70	13	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	637c9b2d-c7f6-4f0e-bdab-6e76d3650f85	\N	\N	Corregir en la seccion de inicio que los proyectos aparezcan en orden de prioridad de avance	\N	completada	baja	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-24	\N	\N	0	2026-04-24 15:33:15.642613+00	2026-04-30 17:57:53.383597+00
f10697b5-01c0-46d5-96c7-df1ef7238a92	1	d24e523f-8e3e-46e1-be30-f8271ceb610c	f9b06e45-3fd9-4736-bdaa-20889df62b32	\N	\N	Generar vista del menu de inicio	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-29	\N	\N	0	2026-04-28 16:32:37.949534+00	2026-04-28 16:32:37.949534+00
11d4da69-d496-4c61-8296-09faf5031dcd	6	4f13a9e6-930d-45e8-9f68-acccef604a9d	65a1cc5d-ab90-4bfb-aaac-8fa1500769c4	\N	\N	POST /auth/logout — marcar refresh_token como revoked=true en BD, retorna 204	\N	completada	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-04	\N	\N	0	2026-04-24 16:37:17.319502+00	2026-05-02 00:38:27.436203+00
557bf093-b007-481e-971e-3a4b706931a2	7	4f13a9e6-930d-45e8-9f68-acccef604a9d	65a1cc5d-ab90-4bfb-aaac-8fa1500769c4	\N	\N	Dependency get_current_user — extrae Bearer token, decodifica JWT, verifica is_active (401/403)	\N	completada	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-04	\N	\N	0	2026-04-24 16:37:17.365306+00	2026-05-03 16:19:56.424877+00
6650f974-44dc-44cb-9fcb-5466f6e25159	10	d24e523f-8e3e-46e1-be30-f8271ceb610c	a48bf78e-3301-46b2-8504-b54a26f0f219	\N	\N	Micro-interacción de "press" visual (hundimiento del botón) para confirmar la selección.	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	\N	\N	\N	0	2026-04-28 17:27:49.256493+00	2026-04-28 17:27:49.256493+00
ee7c0f09-a510-46f8-8ed6-2c6a4f573bd7	8	4f13a9e6-930d-45e8-9f68-acccef604a9d	65a1cc5d-ab90-4bfb-aaac-8fa1500769c4	\N	\N	Dependency get_admin_user — extiende get_current_user, verifica role==admin (403 si viewer)	\N	completada	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-04	\N	\N	0	2026-04-24 16:37:17.499217+00	2026-05-03 16:23:14.909582+00
c3f60323-64e8-4b33-b79c-da30cabc3c35	9	4f13a9e6-930d-45e8-9f68-acccef604a9d	65a1cc5d-ab90-4bfb-aaac-8fa1500769c4	\N	\N	GET /users — listar usuarios solo admin (paginación con skip y limit)	\N	completada	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-04	\N	\N	0	2026-04-24 16:37:17.543295+00	2026-05-03 16:56:19.593795+00
9b022edf-bf6e-4998-a274-cb2c4bcfce11	10	4f13a9e6-930d-45e8-9f68-acccef604a9d	65a1cc5d-ab90-4bfb-aaac-8fa1500769c4	\N	\N	PATCH /users/{id} — editar usuario solo admin (username, email, role, is_active)	\N	completada	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-04	\N	\N	0	2026-04-24 16:37:17.587758+00	2026-05-03 16:56:29.473971+00
734aa037-c856-4eb2-8675-406adf95756f	11	4f13a9e6-930d-45e8-9f68-acccef604a9d	65a1cc5d-ab90-4bfb-aaac-8fa1500769c4	\N	\N	DELETE /users/{id} — soft delete (is_active=false, no elimina registro)	\N	completada	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-04	\N	\N	0	2026-04-24 16:37:17.630912+00	2026-05-03 16:56:40.179797+00
5f7ce71e-4249-4866-9ce3-93326c782d95	12	4f13a9e6-930d-45e8-9f68-acccef604a9d	65a1cc5d-ab90-4bfb-aaac-8fa1500769c4	\N	\N	POST /auth/recover — generar token UUID v4 con expiración 1h, persistir en password_reset_tokens	\N	completada	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-04	\N	\N	0	2026-04-24 16:37:17.675911+00	2026-05-03 18:23:07.165779+00
50c0fa37-dfed-4f0a-b874-73d62c44dfeb	27	027fa9f0-f03f-4c18-970c-9374bace6e5b	dd936700-73c0-49a4-b0ab-c531a0696d44	\N	\N	Revision de logica de boletos vendidos	\N	completada	urgente	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-24	\N	\N	0	2026-04-24 15:29:39.2634+00	2026-04-30 22:30:41.564059+00
7e3e056a-f2f8-4714-8ed0-9b20b2a3d4f1	2	4f13a9e6-930d-45e8-9f68-acccef604a9d	65a1cc5d-ab90-4bfb-aaac-8fa1500769c4	\N	\N	Crear migración Alembic para tabla users (alembic upgrade head)	\N	completada	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-04	\N	\N	0	2026-04-24 16:37:17.137731+00	2026-05-01 00:39:45.022133+00
50cb1b34-efc4-487d-874b-4506181b2f66	32	4f13a9e6-930d-45e8-9f68-acccef604a9d	acd43e7c-6a84-4702-87a6-44348f2fb33a	\N	\N	Definir modelo SQLAlchemy ChangeLog (id UUID, site_id FK, user_id FK, section, change_type, payload_snapshot JSONB, created_at)	\N	completada	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-12	\N	\N	0	2026-04-24 16:37:18.751094+00	2026-05-01 00:53:58.450108+00
eccac48a-1117-4fa7-aa08-52484365df3f	15	4f13a9e6-930d-45e8-9f68-acccef604a9d	c3f1acc9-f071-4af1-9f59-a9696ff2f676	\N	\N	Migración Alembic para tabla sites (índices en owner_id e is_active)	\N	completada	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-04	\N	\N	0	2026-04-24 16:37:17.813418+00	2026-05-01 00:54:34.008633+00
2ad7c4ef-c12e-4aa9-8228-170548c99296	14	4f13a9e6-930d-45e8-9f68-acccef604a9d	c3f1acc9-f071-4af1-9f59-a9696ff2f676	\N	\N	Definir modelo SQLAlchemy Site (UUID, name, base_url, api_token Fernet, description, is_active, owner_id FK)	\N	completada	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-04	\N	\N	0	2026-04-24 16:37:17.766593+00	2026-05-01 00:54:49.595096+00
b0d57da4-0ebc-4a2c-ae5f-28b71e770f75	33	725a2211-9531-466d-ba0b-1df66ef0e70c	f3ce04f9-c71b-4a94-91d7-1acc9366b668	\N	\N	Ttitulo en azul	\N	completada	media	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-30	\N	\N	0	2026-04-30 16:21:30.265874+00	2026-05-01 16:17:59.333843+00
cc1d4bb2-c12b-4b62-b076-bcdabcd8c42a	70	4f13a9e6-930d-45e8-9f68-acccef604a9d	35505d6c-26c7-4ac2-8720-9b0378cb999b	\N	\N	Login: pantalla centrada minimalista con estados default/focus/error/loading	\N	backlog	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-03	\N	\N	0	2026-04-24 16:37:20.528044+00	2026-05-01 17:07:02.873499+00
39b93a71-05f8-4a1b-8bbc-cee9efb741c3	13	4f13a9e6-930d-45e8-9f68-acccef604a9d	65a1cc5d-ab90-4bfb-aaac-8fa1500769c4	\N	\N	POST /auth/reset — verificar token, hashear nueva password, marcar token como used=true	\N	completada	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-04	\N	\N	0	2026-04-24 16:37:17.721317+00	2026-05-03 18:25:03.951001+00
5f2b9e1d-dd05-44f7-ac04-193e1ff129b7	77	4f13a9e6-930d-45e8-9f68-acccef604a9d	4c1ddf19-9825-49d9-af75-1e7e61ad87e4	\N	\N	Sidebar colapsable/drawer en pantallas medianas (768–1023px)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-03	\N	\N	0	2026-04-24 16:37:20.860728+00	2026-05-01 17:13:01.468009+00
6f90425b-bd58-4538-8c57-add16f785187	20	4f13a9e6-930d-45e8-9f68-acccef604a9d	c3f1acc9-f071-4af1-9f59-a9696ff2f676	\N	\N	DELETE /sites/{id} — soft delete (is_active=false, conserva historial), retorna 204	\N	completada	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-04	\N	\N	0	2026-04-24 16:37:18.032744+00	2026-05-03 18:50:40.545081+00
2363e99e-cc42-459a-947d-43da12dfe9e0	21	4f13a9e6-930d-45e8-9f68-acccef604a9d	c5fd6b9d-eda3-4322-a997-fe04eeef8408	\N	\N	Módulo proxy_client.py con httpx.AsyncClient (desencripta api_token con Fernet antes de cada request)	\N	completada	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-12	\N	\N	0	2026-04-24 16:37:18.078126+00	2026-05-04 22:51:18.773477+00
62f99d8a-071e-4002-bd31-ef1201d78aaf	41	4f13a9e6-930d-45e8-9f68-acccef604a9d	5ea59ed3-ed6d-4b0c-966b-28b48d18370f	c8658228-e47d-48d8-8527-3530eadd5618	\N	Llamada a POST /auth/login — access_token en Zustand (memoria), refresh_token en httpOnly cookie vía route handler	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-06	\N	\N	0	2026-04-24 16:37:19.185806+00	2026-05-01 17:21:46.097308+00
fc7fdf98-068a-4ce8-a895-a43f52f693a8	95	4f13a9e6-930d-45e8-9f68-acccef604a9d	087bd354-26a1-4f5f-8f97-8352ff245596	c8658228-e47d-48d8-8527-3530eadd5618	\N	Nginx: location /uploads/ → alias /var/www/panel/uploads/ (logos servidos estáticamente)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-14	\N	\N	0	2026-04-24 16:37:21.701491+00	2026-05-01 17:21:47.080629+00
0e85266e-b070-4f9f-8988-b698596ff466	96	4f13a9e6-930d-45e8-9f68-acccef604a9d	087bd354-26a1-4f5f-8f97-8352ff245596	c8658228-e47d-48d8-8527-3530eadd5618	\N	Headers de seguridad Nginx: X-Frame-Options, X-Content-Type-Options, HSTS	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-14	\N	\N	0	2026-04-24 16:37:21.745277+00	2026-05-01 17:21:47.080629+00
ddea503b-ed03-4b35-8e48-22f4d56c9f99	46	4f13a9e6-930d-45e8-9f68-acccef604a9d	bba769c9-c6c9-4942-a7ce-eff237688f7b	c8658228-e47d-48d8-8527-3530eadd5618	\N	Página /dashboard: consumir GET /sites y renderizar cards (skeleton durante carga, estado vacío)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-06	\N	\N	0	2026-04-24 16:37:19.41034+00	2026-05-01 17:21:55.620522+00
0f50d98f-7899-44f9-8499-52b18359a064	47	4f13a9e6-930d-45e8-9f68-acccef604a9d	bba769c9-c6c9-4942-a7ce-eff237688f7b	c8658228-e47d-48d8-8527-3530eadd5618	\N	Card por sitio: nombre, URL, badge activo/inactivo, botón ver detalle	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-06	\N	\N	0	2026-04-24 16:37:19.463858+00	2026-05-01 17:21:55.620522+00
ba9c51de-b85d-46ff-b836-678e4e9df285	54	4f13a9e6-930d-45e8-9f68-acccef604a9d	6f29f909-98c9-4a27-909e-1111ccac4c3a	9ad22747-cf29-4ad9-a099-56d5c06354a8	\N	Sidebar colapsable en pantallas menores a 1024px	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-11	\N	\N	0	2026-04-24 16:37:19.802425+00	2026-05-01 17:22:16.090805+00
00426212-7970-4492-a992-1d4c8bedebe3	9	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	32659c70-ccc3-4f0d-b444-759e14237e01	01375b73-d0af-4d2c-aa46-f35322c9cb3a	\N	Inhabilitar subtareas en Épicas.	\N	completada	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:04:17.335567+00	2026-04-27 16:41:52.131842+00
e3d6bbdc-5504-4ac7-b552-ad5e2b19ac10	55	4f13a9e6-930d-45e8-9f68-acccef604a9d	6f29f909-98c9-4a27-909e-1111ccac4c3a	9ad22747-cf29-4ad9-a099-56d5c06354a8	\N	Sección Colores: GET /proxy/{id}/colors → swatches editables (clic abre color picker, input hex sincronizado)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-11	\N	\N	0	2026-04-24 16:37:19.846916+00	2026-05-01 17:22:16.090805+00
0804e66d-e55e-4586-9998-b89ad576a0cb	56	4f13a9e6-930d-45e8-9f68-acccef604a9d	6f29f909-98c9-4a27-909e-1111ccac4c3a	9ad22747-cf29-4ad9-a099-56d5c06354a8	\N	Sección Colores: botón Guardar → PUT /proxy/{id}/colors	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-11	\N	\N	0	2026-04-24 16:37:19.8906+00	2026-05-01 17:22:16.090805+00
17b94d21-5d9a-4004-92d3-d46e03e04a0b	58	4f13a9e6-930d-45e8-9f68-acccef604a9d	6f29f909-98c9-4a27-909e-1111ccac4c3a	9ad22747-cf29-4ad9-a099-56d5c06354a8	\N	Sección Logos: botón Aplicar → PUT /proxy/{id}/logos con URL obtenida	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-11	\N	\N	0	2026-04-24 16:37:19.981633+00	2026-05-01 17:22:16.090805+00
677056b9-beaf-4c0a-a7c1-008c43de299d	60	4f13a9e6-930d-45e8-9f68-acccef604a9d	6f29f909-98c9-4a27-909e-1111ccac4c3a	9ad22747-cf29-4ad9-a099-56d5c06354a8	\N	Sección Contenido: botón Guardar → PUT /proxy/{id}/content/{section}	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-11	\N	\N	0	2026-04-24 16:37:20.071203+00	2026-05-01 17:22:16.090805+00
85a306ca-d6df-4fb2-9227-e128479d0b68	59	4f13a9e6-930d-45e8-9f68-acccef604a9d	6f29f909-98c9-4a27-909e-1111ccac4c3a	9ad22747-cf29-4ad9-a099-56d5c06354a8	\N	Sección Contenido: selector de sección y campos editables (GET /proxy/{id}/content/{section})	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-11	\N	\N	0	2026-04-24 16:37:20.025362+00	2026-05-01 17:22:16.090805+00
a0aa320c-d24c-4499-9d17-edfcd5829d9d	17	4f13a9e6-930d-45e8-9f68-acccef604a9d	c3f1acc9-f071-4af1-9f59-a9696ff2f676	\N	\N	POST /sites — crear sitio (encripta api_token con Fernet, FERNET_KEY desde .env)	\N	completada	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-04	\N	\N	0	2026-04-24 16:37:17.900427+00	2026-05-03 18:29:26.646056+00
6d24453d-49a7-49f4-ae64-f2b62ca59f17	16	725a2211-9531-466d-ba0b-1df66ef0e70c	43ea57f7-ae68-4f98-93d6-b8e4986dc948	f98df020-059d-4d67-bc86-b3ae2a99a28c	\N	Reducir tamaño de apartados para resaltar la barra de búsqueda e iconos	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:33:45.053989+00	2026-04-27 17:03:25.388776+00
fe1fb09e-1aff-4253-b2c9-a239357cede2	16	4f13a9e6-930d-45e8-9f68-acccef604a9d	c3f1acc9-f071-4af1-9f59-a9696ff2f676	\N	\N	GET /sites — listar sitios (admin ve todos, viewer solo los suyos por owner_id)	\N	completada	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-04	\N	\N	0	2026-04-24 16:37:17.85679+00	2026-05-03 18:35:38.703377+00
ea086951-8124-45ca-b635-006ca7da4841	18	4f13a9e6-930d-45e8-9f68-acccef604a9d	c3f1acc9-f071-4af1-9f59-a9696ff2f676	\N	\N	GET /sites/{id} — detalle de sitio (verifica owner o admin, sin api_token en claro)	\N	completada	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-04	\N	\N	0	2026-04-24 16:37:17.943494+00	2026-05-03 18:43:26.212077+00
4e7f5f86-3f93-4da2-8959-3e7beb8cf198	19	4f13a9e6-930d-45e8-9f68-acccef604a9d	c3f1acc9-f071-4af1-9f59-a9696ff2f676	\N	\N	PATCH /sites/{id} — editar sitio (re-encripta api_token con Fernet solo si viene en body)	\N	completada	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-04	\N	\N	0	2026-04-24 16:37:17.986317+00	2026-05-03 18:47:34.263193+00
b016ed6e-c21b-42ef-afd2-212880b48438	24	4f13a9e6-930d-45e8-9f68-acccef604a9d	c5fd6b9d-eda3-4322-a997-fe04eeef8408	\N	\N	GET /proxy/{site_id}/content/{section} — llama GET {base_url}/content/{section}, timeout 10s	\N	completada	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-12	\N	\N	0	2026-04-24 16:37:18.297566+00	2026-05-04 22:43:53.590663+00
d1709e12-08e4-42d4-80b7-9360901d9727	25	4f13a9e6-930d-45e8-9f68-acccef604a9d	c5fd6b9d-eda3-4322-a997-fe04eeef8408	\N	\N	GET /proxy/{site_id}/colors — retorna {primary, secondary, accent, bg, text}	\N	completada	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-12	\N	\N	0	2026-04-24 16:37:18.440232+00	2026-05-04 22:44:38.860572+00
016ff391-0e8f-406c-af8b-ee25874e8c03	22	4f13a9e6-930d-45e8-9f68-acccef604a9d	c5fd6b9d-eda3-4322-a997-fe04eeef8408	\N	\N	Función build_headers(api_token) → dict con Authorization: Bearer token	\N	completada	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-12	\N	\N	0	2026-04-24 16:37:18.124086+00	2026-05-04 23:07:46.841464+00
ebfe3306-0111-4f5a-bc46-99e8d81f865e	23	4f13a9e6-930d-45e8-9f68-acccef604a9d	c5fd6b9d-eda3-4322-a997-fe04eeef8408	\N	\N	Manejo centralizado de errores httpx (ConnectTimeout→504, HTTPStatusError→propaga status, RequestError→502)	\N	completada	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-12	\N	\N	0	2026-04-24 16:37:18.253392+00	2026-05-04 23:07:54.938195+00
bc85920f-fd7d-4151-9d24-03f73cd3ea7d	33	4f13a9e6-930d-45e8-9f68-acccef604a9d	acd43e7c-6a84-4702-87a6-44348f2fb33a	\N	\N	Migración Alembic para tabla change_log (índice en site_id y created_at)	\N	completada	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-12	\N	\N	0	2026-04-24 16:37:18.796699+00	2026-05-05 00:19:57.954334+00
6f9b0fab-293d-4dab-8ee3-0c7121eef0b4	11	d24e523f-8e3e-46e1-be30-f8271ceb610c	b74e358a-b832-477f-ba69-4e3e46a121ee	\N	\N	Jerarquía de KPIs (Lo más importante: Ganancia Neta).	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	\N	\N	\N	0	2026-04-28 17:28:53.9436+00	2026-04-28 17:28:53.9436+00
0a04975c-a695-475e-86c7-915326d5c321	31	725a2211-9531-466d-ba0b-1df66ef0e70c	43ea57f7-ae68-4f98-93d6-b8e4986dc948	\N	\N	Homologar el menu hamburguesa	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-28	\N	\N	0	2026-04-28 15:39:59.390236+00	2026-04-28 21:59:41.182831+00
9f3e7988-1f5a-438e-b2bb-48f29b06ce6f	34	725a2211-9531-466d-ba0b-1df66ef0e70c	f3ce04f9-c71b-4a94-91d7-1acc9366b668	\N	\N	Descripcion del producto	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-30	\N	\N	0	2026-04-30 16:22:06.627343+00	2026-05-01 16:18:01.845299+00
c6f78185-b2e7-4a70-9dca-aa3a8f91f72f	18	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	756e6bde-eeea-47c4-91e3-e7d8381caaa2	\N	\N	Las bolitas de cada tarea deben de reflejar su estado	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-05-01	\N	\N	0	2026-04-27 17:01:56.252857+00	2026-05-01 16:25:48.586766+00
e05d31de-db68-42a9-b7c6-25235d714238	76	4f13a9e6-930d-45e8-9f68-acccef604a9d	4c1ddf19-9825-49d9-af75-1e7e61ad87e4	\N	\N	Layout adaptable a pantallas de escritorio (1024px+)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-03	\N	\N	0	2026-04-24 16:37:20.811241+00	2026-05-01 17:07:54.695819+00
151bcd2f-3d0a-4526-ba83-bd7b84110c26	97	4f13a9e6-930d-45e8-9f68-acccef604a9d	3b1c64ca-4cf1-42bc-bc62-9917bf4ecdc4	\N	\N	Script deploy.sh en /var/www/panel/ (git pull origin main + docker compose build + docker compose up -d)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-14	\N	\N	0	2026-04-24 16:37:21.791208+00	2026-05-01 17:15:51.716087+00
3e224159-350b-44ee-ac8c-ecf21471ba86	83	4f13a9e6-930d-45e8-9f68-acccef604a9d	dcfbce7f-d25b-4ebf-aa62-e7affa23f0bf	\N	\N	Dockerfile del backend (python:3.11-slim, usuario no-root, ENTRYPOINT alembic upgrade head + uvicorn)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-14	\N	\N	0	2026-04-24 16:37:21.143165+00	2026-05-01 17:16:10.390192+00
e340ebfa-8cdc-4802-b305-c0bc390a6f03	85	4f13a9e6-930d-45e8-9f68-acccef604a9d	dcfbce7f-d25b-4ebf-aa62-e7affa23f0bf	\N	\N	Dockerfile del frontend multi-stage (node:20-alpine build + runner, CMD next start)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-14	\N	\N	0	2026-04-24 16:37:21.232156+00	2026-05-01 17:16:20.256839+00
7852e7ae-9ca7-4df6-a549-5ac6272ea334	1	2b3e7ea3-1d8c-40c8-949f-542542aac626	\N	\N	\N	afsfa	\N	backlog	media	\N	a4724453-124c-45a3-a8c5-db01560300cc	\N	\N	\N	0	2026-04-29 23:00:32.462344+00	2026-04-29 23:00:32.462344+00
c08919e2-46a5-42c6-8acb-1aac98006678	3	2b3e7ea3-1d8c-40c8-949f-542542aac626	be099d4a-bea0-43a1-84a0-c8e6a93ddb47	\N	\N	fasfdas	\N	backlog	media	\N	a4724453-124c-45a3-a8c5-db01560300cc	\N	\N	\N	0	2026-04-29 23:01:11.187122+00	2026-04-29 23:01:11.187122+00
2bb4847d-dd46-40a2-9904-35390fffa4b5	86	4f13a9e6-930d-45e8-9f68-acccef604a9d	dcfbce7f-d25b-4ebf-aa62-e7affa23f0bf	\N	\N	docker-compose.yml — servicio db (postgres:15-alpine, volumen persistente, variables desde .env)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-14	\N	\N	0	2026-04-24 16:37:21.276362+00	2026-05-01 17:16:29.549068+00
f03d7be9-5ec1-47df-99e2-6f193b99d3cb	87	4f13a9e6-930d-45e8-9f68-acccef604a9d	dcfbce7f-d25b-4ebf-aa62-e7affa23f0bf	\N	\N	docker-compose.yml — servicio backend (puerto 8000 solo red interna, bind mount /uploads)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-14	\N	\N	0	2026-04-24 16:37:21.321102+00	2026-05-01 17:16:35.692152+00
cedf24fb-6cfe-49f5-b4c0-e7f776b902f4	1	c70b1f17-d0d0-4706-b77c-97ed59c954d5	ae2302cf-aeb1-4c8b-95cd-22ea119f8ad1	\N	\N	Revision de referencias	\N	en_revision	urgente	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-27	\N	\N	0	2026-04-27 16:49:43.516159+00	2026-04-27 16:49:43.516159+00
766e1969-2c5e-4f3a-b528-8bd9d439fa6a	88	4f13a9e6-930d-45e8-9f68-acccef604a9d	dcfbce7f-d25b-4ebf-aa62-e7affa23f0bf	\N	\N	docker-compose.yml — servicio frontend (puerto 3000 solo red interna, depends_on backend)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-14	\N	\N	0	2026-04-24 16:37:21.376422+00	2026-05-01 17:16:43.463883+00
9db77372-aca8-4b4f-a96e-7695dfb8b385	89	4f13a9e6-930d-45e8-9f68-acccef604a9d	dcfbce7f-d25b-4ebf-aa62-e7affa23f0bf	\N	\N	Red privada panel_network (driver: bridge) — ningún contenedor expone puertos al host directamente	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-14	\N	\N	0	2026-04-24 16:37:21.422525+00	2026-05-01 17:16:50.037954+00
1c72e3ab-9e3f-42ea-a1fc-e50c75205d68	90	4f13a9e6-930d-45e8-9f68-acccef604a9d	dcfbce7f-d25b-4ebf-aa62-e7affa23f0bf	\N	\N	Archivo .env en /var/www/panel/ con todas las variables (DATABASE_URL, SECRET_KEY, FERNET_KEY, tokens, NEXT_PUBLIC_API_URL)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-14	\N	\N	0	2026-04-24 16:37:21.472265+00	2026-05-01 17:16:57.480553+00
08a31b11-d2a5-4344-8b0b-942378925686	91	4f13a9e6-930d-45e8-9f68-acccef604a9d	dcfbce7f-d25b-4ebf-aa62-e7affa23f0bf	\N	\N	.gitignore: excluir .env y uploads/	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-14	\N	\N	0	2026-04-24 16:37:21.516447+00	2026-05-01 17:17:01.970304+00
6e75f224-76ae-440d-9ee7-c524d4c6d684	72	4f13a9e6-930d-45e8-9f68-acccef604a9d	35505d6c-26c7-4ac2-8720-9b0378cb999b	\N	\N	Vista detalle de sitio con secciones claramente separadas	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-03	\N	\N	0	2026-04-24 16:37:20.620959+00	2026-05-01 17:07:15.612036+00
0d3f69f1-06d0-4789-836f-08a60a5eaa71	73	4f13a9e6-930d-45e8-9f68-acccef604a9d	35505d6c-26c7-4ac2-8720-9b0378cb999b	\N	\N	Sidebar: ícono + label, ítem activo resaltado, transición suave entre secciones	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-03	\N	\N	0	2026-04-24 16:37:20.666652+00	2026-05-01 17:07:20.903806+00
771eb496-db99-4292-a2f1-143e72273752	74	4f13a9e6-930d-45e8-9f68-acccef604a9d	35505d6c-26c7-4ac2-8720-9b0378cb999b	\N	\N	Swatches de color con color picker nativo + input hex sincronizado	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-03	\N	\N	0	2026-04-24 16:37:20.712336+00	2026-05-01 17:07:30.188117+00
89b6ad41-7fa5-4a1e-b8f8-ff22b955463c	80	4f13a9e6-930d-45e8-9f68-acccef604a9d	2386ce78-c07a-4ba0-b711-404e5a0acf1c	\N	\N	Instalar Nginx en el host (no como contenedor) — sudo apt install nginx	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-14	\N	\N	0	2026-04-24 16:37:21.007622+00	2026-05-01 17:15:33.467639+00
cba8d8b5-18e9-4fda-a893-67748a81d2e4	82	4f13a9e6-930d-45e8-9f68-acccef604a9d	2386ce78-c07a-4ba0-b711-404e5a0acf1c	\N	\N	Crear estructura de directorios en /var/www/panel/ (backend/, frontend/, uploads/ con permisos escritura)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-14	\N	\N	0	2026-04-24 16:37:21.099255+00	2026-05-01 17:15:43.170244+00
6191c709-0f13-42d0-b69b-7d5dea237a15	92	4f13a9e6-930d-45e8-9f68-acccef604a9d	087bd354-26a1-4f5f-8f97-8352ff245596	c8658228-e47d-48d8-8527-3530eadd5618	\N	Virtual host panel.dominio.com con SSL gestionado por Certbot	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-14	\N	\N	0	2026-04-24 16:37:21.561787+00	2026-05-01 17:21:47.080629+00
d4b44294-cd00-4e76-89af-fc645e655ea2	48	4f13a9e6-930d-45e8-9f68-acccef604a9d	bba769c9-c6c9-4942-a7ce-eff237688f7b	c8658228-e47d-48d8-8527-3530eadd5618	\N	Formulario /sites/new — crear sitio (nombre, base_url, api_token, descripción; valida URL antes de enviar)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-06	\N	\N	0	2026-04-24 16:37:19.509817+00	2026-05-01 17:21:55.620522+00
d7b66a93-eea2-4a64-b321-59763a3f58e4	50	4f13a9e6-930d-45e8-9f68-acccef604a9d	bba769c9-c6c9-4942-a7ce-eff237688f7b	c8658228-e47d-48d8-8527-3530eadd5618	\N	Vista detalle /sites/{id}: info del sitio y secciones de edición	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-06	\N	\N	0	2026-04-24 16:37:19.609824+00	2026-05-01 17:21:55.620522+00
5e35e541-fc56-4942-96f0-e051205b6daf	51	4f13a9e6-930d-45e8-9f68-acccef604a9d	bba769c9-c6c9-4942-a7ce-eff237688f7b	c8658228-e47d-48d8-8527-3530eadd5618	\N	Aplicar paleta de la marca activa en :root como CSS custom properties al seleccionar sitio	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-06	\N	\N	0	2026-04-24 16:37:19.654847+00	2026-05-01 17:21:55.620522+00
4d2810d7-ea9f-49d9-8ec5-5bdb9643300a	52	4f13a9e6-930d-45e8-9f68-acccef604a9d	bba769c9-c6c9-4942-a7ce-eff237688f7b	c8658228-e47d-48d8-8527-3530eadd5618	\N	Mostrar logo de la marca activa en el header del panel (GET /proxy/{id}/logos)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-06	\N	\N	0	2026-04-24 16:37:19.699264+00	2026-05-01 17:21:55.620522+00
6825af05-9ac8-4ead-930f-65c661feb7cd	62	4f13a9e6-930d-45e8-9f68-acccef604a9d	6f29f909-98c9-4a27-909e-1111ccac4c3a	9ad22747-cf29-4ad9-a099-56d5c06354a8	\N	Sección Historial: lista paginada GET /history/{id} con filtros por tipo de cambio y sección	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-11	\N	\N	0	2026-04-24 16:37:20.159314+00	2026-05-01 17:22:16.090805+00
1d027e1a-6ee8-4fbd-9f1d-2bc17640dbe0	26	4f13a9e6-930d-45e8-9f68-acccef604a9d	c5fd6b9d-eda3-4322-a997-fe04eeef8408	\N	\N	GET /proxy/{site_id}/logos — retorna {logo_url, favicon_url}	\N	completada	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-12	\N	\N	0	2026-04-24 16:37:18.483591+00	2026-05-04 22:46:08.223018+00
c936afd5-3bb3-4d95-b428-fcf1feab2794	27	4f13a9e6-930d-45e8-9f68-acccef604a9d	c5fd6b9d-eda3-4322-a997-fe04eeef8408	\N	\N	PUT /proxy/{site_id}/content/{section} — reenvía body al sitio con PUT {base_url}/content/{section}	\N	completada	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-12	\N	\N	0	2026-04-24 16:37:18.528027+00	2026-05-04 23:44:59.655655+00
c27b8a9f-02cf-407f-b6af-64f1003df37e	28	4f13a9e6-930d-45e8-9f68-acccef604a9d	c5fd6b9d-eda3-4322-a997-fe04eeef8408	\N	\N	PUT /proxy/{site_id}/colors — reenvía paleta al sitio	\N	completada	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-12	\N	\N	0	2026-04-24 16:37:18.571772+00	2026-05-04 23:46:03.98552+00
d66eb892-e7ba-4ee9-ba9f-320cc8f3e2b9	29	4f13a9e6-930d-45e8-9f68-acccef604a9d	c5fd6b9d-eda3-4322-a997-fe04eeef8408	\N	\N	PUT /proxy/{site_id}/logos — reenvía URL del logo al sitio	\N	completada	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-12	\N	\N	0	2026-04-24 16:37:18.616283+00	2026-05-04 23:47:37.717712+00
0d303b73-c21f-4310-bb56-acc1834a54c5	30	4f13a9e6-930d-45e8-9f68-acccef604a9d	c5fd6b9d-eda3-4322-a997-fe04eeef8408	\N	\N	DELETE /proxy/{site_id}/content/{section} — delega borrado al sitio, retorna 204	\N	completada	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-12	\N	\N	0	2026-04-24 16:37:18.661555+00	2026-05-04 23:49:52.256869+00
7b4a91ce-77c3-4c64-b2a8-5d3333e676ad	31	4f13a9e6-930d-45e8-9f68-acccef604a9d	c5fd6b9d-eda3-4322-a997-fe04eeef8408	\N	\N	POST /files/upload — multipart/form-data, valida mime (png/jpeg/svg), max 2MB, guarda en /uploads/{uuid}.{ext}	\N	completada	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-12	\N	\N	0	2026-04-24 16:37:18.707029+00	2026-05-04 23:54:36.555033+00
22ba8246-efea-4d75-8b8d-bee18f0b09df	34	4f13a9e6-930d-45e8-9f68-acccef604a9d	acd43e7c-6a84-4702-87a6-44348f2fb33a	\N	\N	Función async log_change(db, site_id, user_id, section, type, payload) — se invoca tras 2xx del sitio	\N	completada	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-12	\N	\N	0	2026-04-24 16:37:18.842248+00	2026-05-05 00:28:11.862478+00
48a40fed-2aa7-42a5-8242-f1faeb8a3ef1	35	4f13a9e6-930d-45e8-9f68-acccef604a9d	acd43e7c-6a84-4702-87a6-44348f2fb33a	\N	\N	GET /history/{site_id} — historial paginado (filtros section y change_type, ordenado por created_at DESC)	\N	completada	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-12	\N	\N	0	2026-04-24 16:37:18.887092+00	2026-05-05 00:31:40.193041+00
dda8c736-9568-487a-baa2-cc3eca7f38e1	40	4f13a9e6-930d-45e8-9f68-acccef604a9d	5ea59ed3-ed6d-4b0c-966b-28b48d18370f	c8658228-e47d-48d8-8527-3530eadd5618	\N	Página /login con form email y password (Next.js App Router, componente cliente, estado local)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-06	\N	\N	0	2026-04-24 16:37:19.139183+00	2026-05-01 17:21:46.097308+00
441e3fb9-915d-4ba6-895e-d753dc2d5e27	49	4f13a9e6-930d-45e8-9f68-acccef604a9d	bba769c9-c6c9-4942-a7ce-eff237688f7b	c8658228-e47d-48d8-8527-3530eadd5618	\N	Formulario /sites/{id}/edit — editar sitio (pre-rellenado desde GET /sites/{id}, llama PATCH)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-06	\N	\N	0	2026-04-24 16:37:19.558772+00	2026-05-01 17:21:55.620522+00
2b59fce0-ce58-4ac6-943d-f8668ef0b278	12	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	32659c70-ccc3-4f0d-b444-759e14237e01	\N	\N	[fix] Epica no asigna correctamente las tareas	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-24	\N	\N	0	2026-04-24 15:31:44.153418+00	2026-04-27 16:50:08.734954+00
e194b433-2888-459e-aafd-7a96f198431c	1	bab1aa48-dc68-4165-8847-30e240091641	7c045a8a-a875-4eb8-a750-16e56c287315	\N	\N	Crear docker de desarrollo [Fronted y backend]	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-27	\N	\N	0	2026-04-27 17:12:13.76977+00	2026-04-27 17:14:21.069636+00
144a5255-6110-4301-833c-468c57c58e94	5	bab1aa48-dc68-4165-8847-30e240091641	f42f1212-3e8d-40a7-bbcc-3556db92d742	\N	\N	Generar testimonios	Revisa la referencias y conforme a ello genera un diseño para RecTrack	backlog	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-28	\N	\N	0	2026-04-27 17:21:44.606622+00	2026-04-27 17:21:51.070887+00
b4052029-8d44-4e9c-bbe9-a93f6de68d95	8	bab1aa48-dc68-4165-8847-30e240091641	56ec65b0-f6d9-46c0-99eb-8f02ea4cd26c	\N	\N	Generar seccion de proyectos	\N	backlog	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-29	\N	\N	0	2026-04-27 17:26:25.608948+00	2026-04-27 17:26:25.608948+00
c54f69d9-4e2b-4086-8bf9-78eb6bc22b6b	9	bab1aa48-dc68-4165-8847-30e240091641	56ec65b0-f6d9-46c0-99eb-8f02ea4cd26c	\N	\N	Generar seccion de footer	\N	backlog	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-29	\N	\N	0	2026-04-27 17:26:39.716102+00	2026-04-27 17:26:39.716102+00
246a1598-478c-4b16-b9c9-a59933ce18d4	10	bab1aa48-dc68-4165-8847-30e240091641	f42f1212-3e8d-40a7-bbcc-3556db92d742	\N	\N	Generar seccion de proyectos	\N	backlog	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-29	\N	\N	0	2026-04-27 17:26:49.906802+00	2026-04-27 17:26:49.906802+00
1fc75d59-36e8-44ea-9028-070d2986383c	11	bab1aa48-dc68-4165-8847-30e240091641	f42f1212-3e8d-40a7-bbcc-3556db92d742	\N	\N	Generar seccion de footer	\N	backlog	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-29	\N	\N	0	2026-04-27 17:27:00.942687+00	2026-04-27 17:27:00.942687+00
f7a4b498-5769-4ea3-b5b9-637d6449cc41	21	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	756e6bde-eeea-47c4-91e3-e7d8381caaa2	\N	\N	Generar el apartado de creacion de documentos de entrega	\N	backlog	urgente	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-27	\N	\N	0	2026-04-27 17:38:01.362595+00	2026-04-27 17:38:06.624081+00
7d4f73a1-5a66-4296-af9c-1a46e7f588a3	25	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	32659c70-ccc3-4f0d-b444-759e14237e01	\N	\N	Fix: Corregir en seccion de proyectos la vista de edicion de proyectos	No deja guardar cambios porque no hay vista responsiva	completada	urgente	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-28	\N	\N	0	2026-04-28 16:42:02.55012+00	2026-04-30 14:16:10.753842+00
bd6678b9-52a6-4709-bd8d-ea9c5ad1d546	109	4f13a9e6-930d-45e8-9f68-acccef604a9d	f5824ba1-f569-44fb-a6ba-f43aa417632d	\N	\N	Commits con formato convencional: feat, fix, docs, chore, refactor	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	\N	\N	\N	0	2026-04-24 16:37:22.404128+00	2026-04-28 13:39:17.859698+00
0bd0013c-8e91-47c9-974f-1ccb62629f18	105	4f13a9e6-930d-45e8-9f68-acccef604a9d	f5824ba1-f569-44fb-a6ba-f43aa417632d	\N	\N	Documentar todos los endpoints en Swagger UI (/docs) con docstrings (método, ruta, body, response, errores)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-15	\N	\N	0	2026-04-24 16:37:22.191627+00	2026-04-28 17:15:11.045135+00
9655a268-f283-47b8-b9ee-c302540cae97	106	4f13a9e6-930d-45e8-9f68-acccef604a9d	f5824ba1-f569-44fb-a6ba-f43aa417632d	\N	\N	Documentar el contrato de API que debe implementar un sitio externo (GET/PUT /content, /colors, /logos, DELETE)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-15	\N	\N	0	2026-04-24 16:37:22.242682+00	2026-04-28 17:15:34.527534+00
a276f31d-bd9b-4442-868a-b858d34fce92	107	4f13a9e6-930d-45e8-9f68-acccef604a9d	f5824ba1-f569-44fb-a6ba-f43aa417632d	\N	\N	Documentar cómo registrar y conectar un nuevo sitio al panel (implementar contrato, registrar, verificar)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-15	\N	\N	0	2026-04-24 16:37:22.291206+00	2026-04-28 17:16:07.13951+00
bc7763b6-5fc0-4690-8975-b554d9d8fe2c	108	4f13a9e6-930d-45e8-9f68-acccef604a9d	f5824ba1-f569-44fb-a6ba-f43aa417632d	\N	\N	Todo el código, variables, funciones, comentarios y commits en inglés	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-15	\N	\N	0	2026-04-24 16:37:22.345764+00	2026-04-28 17:16:24.92007+00
7b9e0a9a-4ba5-459c-80fe-55c90bc1f96e	100	4f13a9e6-930d-45e8-9f68-acccef604a9d	746331b6-65d2-4a1a-a622-be391c4b57ac	\N	\N	README: descripción del proyecto y arquitectura (diagrama servicios, puertos, flujo Nginx → contenedores)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-15	\N	\N	0	2026-04-24 16:37:21.934093+00	2026-04-28 17:16:48.254464+00
2e6006fc-2e37-4a77-a78c-91acb2a7b837	101	4f13a9e6-930d-45e8-9f68-acccef604a9d	746331b6-65d2-4a1a-a622-be391c4b57ac	\N	\N	README: requisitos previos (Docker, Docker Compose, Nginx, Certbot, dominio apuntando al VPS)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-15	\N	\N	0	2026-04-24 16:37:21.985433+00	2026-04-28 17:17:06.117346+00
53dca069-7858-4ba5-980b-bec5298926e7	102	4f13a9e6-930d-45e8-9f68-acccef604a9d	746331b6-65d2-4a1a-a622-be391c4b57ac	\N	\N	README: instrucciones para levantar en local (clonar, .env desde .env.example, docker compose up)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-15	\N	\N	0	2026-04-24 16:37:22.039051+00	2026-04-28 17:17:22.73697+00
c04effd9-26c4-492f-a79b-494abb7f477f	103	4f13a9e6-930d-45e8-9f68-acccef604a9d	746331b6-65d2-4a1a-a622-be391c4b57ac	\N	\N	README: instrucciones para deploy en VPS paso a paso (instalación dependencias hasta deploy.sh)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-15	\N	\N	0	2026-04-24 16:37:22.093084+00	2026-04-28 17:17:38.936589+00
880a132d-10eb-46b0-9235-c506fa2740fe	104	4f13a9e6-930d-45e8-9f68-acccef604a9d	746331b6-65d2-4a1a-a622-be391c4b57ac	\N	\N	README: todas las variables de entorno documentadas con descripción y valor de ejemplo	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-15	\N	\N	0	2026-04-24 16:37:22.14563+00	2026-04-28 17:17:58.169964+00
8e0cd0eb-cb35-44fd-86c1-36aac69a7ed9	12	d24e523f-8e3e-46e1-be30-f8271ceb610c	b74e358a-b832-477f-ba69-4e3e46a121ee	\N	\N	* Dashboard Económico: Tarjetas prominentes con sombras suaves para separar "Venta Total", "Costo" y "Ganancia".	Gráfica Lineal: Diseño de gráfico de tendencia de ventas (semanal/mensual).\nInterfaz de Corte: Pantalla de comparación de dos columnas (Sistema vs. Físico).	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	\N	\N	\N	0	2026-04-28 17:29:12.644571+00	2026-04-28 17:29:39.04559+00
e5ea7b08-c3ad-498b-8990-270fcaa71740	29	725a2211-9531-466d-ba0b-1df66ef0e70c	8508f132-e1f8-4b2a-ac66-14d58453b09b	\N	\N	Agregar en panel de menu de shopify para edicion de ambas tipos de imagenes en cada contenedor	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-28	\N	\N	0	2026-04-28 15:25:47.479024+00	2026-04-28 21:59:46.996664+00
0e4c9a4e-f214-4bd1-bbb4-6716521cba5c	4	2b3e7ea3-1d8c-40c8-949f-542542aac626	be099d4a-bea0-43a1-84a0-c8e6a93ddb47	\N	\N	safsfasfa	\N	backlog	media	\N	a4724453-124c-45a3-a8c5-db01560300cc	\N	\N	\N	0	2026-04-29 23:01:32.797816+00	2026-04-29 23:01:32.797816+00
4abb5691-426c-433a-99d2-ea8e6bfa7bf8	5	2b3e7ea3-1d8c-40c8-949f-542542aac626	be099d4a-bea0-43a1-84a0-c8e6a93ddb47	\N	\N	sfdaffasf	\N	backlog	media	\N	a4724453-124c-45a3-a8c5-db01560300cc	\N	\N	\N	0	2026-04-29 23:01:38.590614+00	2026-04-29 23:01:38.590614+00
77f2cbf3-f009-40a5-ab71-56b78bab39c5	6	2b3e7ea3-1d8c-40c8-949f-542542aac626	3a494394-0e56-4169-9da1-590ac85dd71f	\N	\N	afsfasfa	\N	backlog	media	\N	a4724453-124c-45a3-a8c5-db01560300cc	\N	\N	\N	0	2026-04-29 23:01:50.28311+00	2026-04-29 23:01:50.28311+00
57ed36fb-85a5-4d05-81f3-b4dc2e01599b	35	725a2211-9531-466d-ba0b-1df66ef0e70c	f3ce04f9-c71b-4a94-91d7-1acc9366b668	\N	\N	Cards	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-30	\N	\N	0	2026-04-30 16:22:17.448596+00	2026-05-01 16:18:04.901657+00
4a916651-ab17-4eae-b24f-f6aeb2be3e39	36	725a2211-9531-466d-ba0b-1df66ef0e70c	7c1cd6b7-9c0a-4ea7-ab2f-ccc0cd55eccd	\N	\N	Crear apartado de titulo, descripcion, imagen del producto boton de manual	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-30	\N	\N	0	2026-04-30 16:26:15.05058+00	2026-05-01 16:18:07.917594+00
57866bd8-f3ca-4747-987c-0c19571f540e	37	725a2211-9531-466d-ba0b-1df66ef0e70c	7c1cd6b7-9c0a-4ea7-ab2f-ccc0cd55eccd	\N	\N	ageregar apartado de videos de youtube	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-30	\N	\N	0	2026-04-30 16:26:34.820611+00	2026-05-01 16:18:10.573621+00
277621d2-356b-4641-8b12-e7bcbaf0ead4	78	4f13a9e6-930d-45e8-9f68-acccef604a9d	4c1ddf19-9825-49d9-af75-1e7e61ad87e4	\N	\N	Roles ARIA y navegación por teclado en todos los componentes interactivos	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-03	\N	\N	0	2026-04-24 16:37:20.905273+00	2026-05-01 17:08:08.086624+00
5f6cd8b2-f0b5-4bda-80b3-d69be7af466a	66	4f13a9e6-930d-45e8-9f68-acccef604a9d	d01647a3-9317-4bbc-93e5-ac75d96f79a7	\N	\N	Definir tokens de diseño en globals.css (paleta neutra, escala tipográfica, espaciado, radios como CSS custom props)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-03	\N	\N	0	2026-04-24 16:37:20.341693+00	2026-05-01 17:08:49.669049+00
fd2d4f7b-b346-45a3-82da-6f5566d8cc4d	67	4f13a9e6-930d-45e8-9f68-acccef604a9d	d01647a3-9317-4bbc-93e5-ac75d96f79a7	\N	\N	Componentes base: Button (primary/secondary/ghost), Input, Select, Textarea	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-03	\N	\N	0	2026-04-24 16:37:20.388319+00	2026-05-01 17:08:54.118281+00
cf8ace6b-89d7-4a24-bcac-1f2278a4ca7a	68	4f13a9e6-930d-45e8-9f68-acccef604a9d	d01647a3-9317-4bbc-93e5-ac75d96f79a7	\N	\N	Card, Badge (activo/inactivo/error), Modal de confirmación genérico	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-03	\N	\N	0	2026-04-24 16:37:20.433317+00	2026-05-01 17:08:58.220851+00
714817c0-c2f3-4070-87bb-60e8dcbfc87d	69	4f13a9e6-930d-45e8-9f68-acccef604a9d	d01647a3-9317-4bbc-93e5-ac75d96f79a7	\N	\N	Elegir librería de iconos (Lucide o Phosphor) y aplicarla consistentemente en todo el panel	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-03	\N	\N	0	2026-04-24 16:37:20.480506+00	2026-05-01 17:09:04.514374+00
6b0b5be3-b8ea-4858-8914-0a3e9720d67d	2	2b3e7ea3-1d8c-40c8-949f-542542aac626	be099d4a-bea0-43a1-84a0-c8e6a93ddb47	\N	\N	fasfafas	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	\N	\N	\N	0	2026-04-29 23:00:46.842077+00	2026-04-29 23:03:22.828263+00
26999ab0-81a0-4936-a108-287577640277	98	4f13a9e6-930d-45e8-9f68-acccef604a9d	3b1c64ca-4cf1-42bc-bc62-9917bf4ecdc4	\N	\N	Script backup.sh: pg_dump diario comprimido con gzip, retener últimos 7 archivos en /backups/	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-14	\N	\N	0	2026-04-24 16:37:21.83752+00	2026-05-01 17:15:56.570323+00
6a305c83-3738-4540-b650-5456c87ed78d	99	4f13a9e6-930d-45e8-9f68-acccef604a9d	3b1c64ca-4cf1-42bc-bc62-9917bf4ecdc4	\N	\N	Cron entry para backup diario a las 2am (0 2 * * * /var/www/panel/backup.sh)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-14	\N	\N	0	2026-04-24 16:37:21.881536+00	2026-05-01 17:16:01.37108+00
5ed450e4-5ccc-4ac4-a703-c5e65c551fd3	57	4f13a9e6-930d-45e8-9f68-acccef604a9d	6f29f909-98c9-4a27-909e-1111ccac4c3a	9ad22747-cf29-4ad9-a099-56d5c06354a8	\N	Sección Logos: zona drag and drop (PNG, JPG, SVG, max 2MB) → POST /files/upload, previsualización	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-11	\N	\N	0	2026-04-24 16:37:19.938775+00	2026-05-01 17:22:16.090805+00
006890db-0d14-4d77-abdf-743e48dbda1b	61	4f13a9e6-930d-45e8-9f68-acccef604a9d	6f29f909-98c9-4a27-909e-1111ccac4c3a	9ad22747-cf29-4ad9-a099-56d5c06354a8	\N	Sección Contenido: botón Limpiar → DELETE /proxy/{id}/content/{section} con modal de confirmación	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-11	\N	\N	0	2026-04-24 16:37:20.115648+00	2026-05-01 17:22:16.090805+00
eec4e210-84c3-49a9-a680-827f8da5600a	63	4f13a9e6-930d-45e8-9f68-acccef604a9d	279cf786-de7c-467f-a67a-1da9be44ef8b	9ad22747-cf29-4ad9-a099-56d5c06354a8	\N	Inyectar colores de la marca en :root al seleccionar sitio (document.documentElement.style.setProperty)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-11	\N	\N	0	2026-04-24 16:37:20.203738+00	2026-05-01 17:22:31.932618+00
f3859a7b-132d-4328-9dbd-99d6232f5498	64	4f13a9e6-930d-45e8-9f68-acccef604a9d	279cf786-de7c-467f-a67a-1da9be44ef8b	9ad22747-cf29-4ad9-a099-56d5c06354a8	\N	Tema neutro (grises, blanco) como estado base en globals.css antes de seleccionar sitio	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-11	\N	\N	0	2026-04-24 16:37:20.247652+00	2026-05-01 17:22:31.932618+00
33ea391c-23a5-4dd0-a05a-adc18e034b00	65	4f13a9e6-930d-45e8-9f68-acccef604a9d	279cf786-de7c-467f-a67a-1da9be44ef8b	9ad22747-cf29-4ad9-a099-56d5c06354a8	\N	Tipografía del panel no cambia: solo varían colores y logo al cambiar de sitio	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-11	\N	\N	0	2026-04-24 16:37:20.292685+00	2026-05-01 17:22:31.932618+00
9ced7970-249a-45af-a014-bc22a05d1b3d	3	4f13a9e6-930d-45e8-9f68-acccef604a9d	65a1cc5d-ab90-4bfb-aaac-8fa1500769c4	\N	\N	POST /auth/register — crear usuario (valida unicidad email, hashea password con passlib[bcrypt])	\N	completada	media	a87077af-4d41-4ea3-a738-73ee9b84b9d3	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-04	\N	\N	0	2026-04-24 16:37:17.181661+00	2026-05-01 17:30:44.038325+00
d9d6ce62-8364-46ad-84b5-2ba1f8ba4585	111	4f13a9e6-930d-45e8-9f68-acccef604a9d	\N	\N	\N	Reagendar tareas atrasadas de Daniel y reagendarlas	\N	completada	urgente	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-01	\N	\N	0	2026-05-01 16:46:42.992018+00	2026-05-04 15:21:35.345811+00
2cc9ff56-f90c-48d0-9f14-7e7716667bba	1	2ea5d18d-0cd2-4235-8fa8-515a7bd5541e	\N	\N	\N	Instalar camara	\N	en_revision	urgente	60ce5ac5-9ee2-427d-98c5-f7ef2ee556f3	60ce5ac5-9ee2-427d-98c5-f7ef2ee556f3	2026-05-09	\N	\N	0	2026-05-06 21:57:11.18985+00	2026-05-06 21:57:11.18985+00
f284362f-bc41-49db-9831-6c4da7af4d2b	19	027fa9f0-f03f-4c18-970c-9374bace6e5b	dd936700-73c0-49a4-b0ab-c531a0696d44	3057c16c-24fb-42e4-95c7-eed1e6ae0f3f	\N	Sincronización en tiempo real de números disponibles basados en el inventario de Google Sheets.	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:51:10.222718+00	2026-05-01 16:13:17.371652+00
aa12f6d1-9ead-45bf-964f-e515ad8a22a0	23	027fa9f0-f03f-4c18-970c-9374bace6e5b	9dc22c5e-c35a-4a44-a761-fd3ac0a0b1df	5be5bf35-bf12-4979-bcf4-67f36e8ae74c	\N	Diseño de la sección de "Boletos Vendidos" cumpliendo con los estándares legales de exposición de datos mínimos.	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:00:01.387157+00	2026-05-01 16:13:30.587627+00
49caac40-4859-4f0e-b05e-110d24bf4e68	25	027fa9f0-f03f-4c18-970c-9374bace6e5b	666ce9bf-453e-4b78-b3c5-78bd2e9b145f	618ff6cb-9f39-4f13-b3d1-60ad1cbc3489	\N	Transiciones y efectos de carga al momento de procesar la selección aleatoria para mejorar la experiencia de usuario.	\N	completada	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:02:09.715391+00	2026-05-01 16:13:41.585725+00
4d449a88-ee07-4c75-b18d-3d4bb6093917	26	027fa9f0-f03f-4c18-970c-9374bace6e5b	dd936700-73c0-49a4-b0ab-c531a0696d44	\N	\N	1. Solicitar datos para mercado pago	con las credenciales que nos proporciona el cliente configurar link de pago o Api de pago de mercado pago	completada	urgente	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-24	\N	\N	0	2026-04-24 15:25:59.799634+00	2026-05-01 16:13:46.184516+00
3baf84bd-a91e-464d-ab08-fe5535a6beb3	29	027fa9f0-f03f-4c18-970c-9374bace6e5b	d6414c59-d461-462d-8a6b-e3a0d4c0e777	\N	\N	Agregar boton para eliminar boletos	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-28	\N	\N	0	2026-04-28 15:54:09.801404+00	2026-05-01 16:13:49.638664+00
e6dfc36b-2fd9-4c93-b175-bde76bf5dd3e	33	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	56a2ceb8-5331-43ce-9c9c-58fb91591a28	\N	\N	Cada vez que se cree una tarea mandar un mensaje al canal de desrrollo	\N	backlog	baja	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-05-09	\N	\N	0	2026-05-01 16:38:03.6785+00	2026-05-01 16:38:03.6785+00
ef1b94ea-bee4-4f40-a358-382e66c9c68a	41	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	fae89dc3-6b18-400f-b04c-bd94a1381d99	\N	\N	Ajustar vistas generales de la aplicacion para que funcionen con el sistema de permisos	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-05-06	\N	\N	0	2026-05-01 17:02:43.502903+00	2026-05-01 17:02:43.502903+00
beb52a27-90ef-4af9-9761-fa44cf3c9ac8	14	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	32659c70-ccc3-4f0d-b444-759e14237e01	\N	\N	Ajuste de persistencia del Sidebar en Panel de Tareas	Necesito que el menú de la izquierda se quede fijo. Actualmente, cada vez que asigno a alguien, el menú se quita solo. Quiero que se mantenga ahí para poder seguir trabajando con las demás áreas sin tener que volver a abrirlo cada vez.	completada	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-29	\N	\N	0	2026-04-24 17:36:18.717751+00	2026-04-30 18:53:34.748336+00
732b35ae-4e06-4788-ad99-5e794907df56	29	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	32659c70-ccc3-4f0d-b444-759e14237e01	\N	\N	Agregar logica de eiminacion de tareas	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-05-01	\N	\N	0	2026-05-01 15:48:02.899673+00	2026-05-01 15:48:02.899673+00
fdbb9320-9c81-4001-bbec-abe5e3db9b19	30	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	756e6bde-eeea-47c4-91e3-e7d8381caaa2	\N	\N	en proyectos agregar una fecha de inicio y agregar bandera visual de stanby	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-05-01	\N	\N	0	2026-05-01 16:24:46.672623+00	2026-05-01 16:26:11.250291+00
7188aff8-9e82-4765-9add-c8322def52fd	34	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	32659c70-ccc3-4f0d-b444-759e14237e01	\N	\N	Corregir logica de vencimiento de tareas	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-05-04	\N	\N	0	2026-05-01 16:42:37.699758+00	2026-05-01 16:42:37.699758+00
a8c72c9a-ddb4-4d5c-95e8-0d08125a5fdf	37	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	756e6bde-eeea-47c4-91e3-e7d8381caaa2	\N	\N	Exportar de forma masiva la infromacion de los proyectos en formato TON	\N	backlog	baja	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-05-09	\N	\N	0	2026-05-01 16:56:33.045527+00	2026-05-01 16:56:33.045527+00
8844586b-b260-4d49-b8ba-30d90ac2293e	2	c70b1f17-d0d0-4706-b77c-97ed59c954d5	\N	\N	\N	Planeacion de proyecto	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-05-01	\N	\N	0	2026-05-01 17:03:50.984062+00	2026-05-01 17:03:50.984062+00
8788db8e-381d-40e6-a6b3-ba2257851d00	7	2b3e7ea3-1d8c-40c8-949f-542542aac626	\N	\N	\N	Planeacion de proyecto	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-05-03	\N	\N	0	2026-05-01 17:04:20.526122+00	2026-05-01 17:04:20.526122+00
1dc42a37-0961-4e12-b059-466f5a5a783e	1	8293a962-1901-46bb-9ab6-bb151126376b	b7ab6c66-8ae8-4442-8915-72360a9726d6	\N	\N	El desarrollo sera en react native	\N	backlog	media	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	\N	\N	\N	0	2026-05-04 15:48:45.176385+00	2026-05-04 15:49:08.199769+00
dfde5564-9954-471c-8271-b034e4b153f2	1	0a335258-4581-4b16-a561-c5b7bc4d5609	\N	\N	\N	Levantamiento CCTV	\N	en_revision	alta	60ce5ac5-9ee2-427d-98c5-f7ef2ee556f3	60ce5ac5-9ee2-427d-98c5-f7ef2ee556f3	2026-05-07	\N	\N	0	2026-05-07 13:27:49.205552+00	2026-05-07 13:28:34.787506+00
a687d80a-12da-4671-9f1f-52d6fd5ef7e0	38	725a2211-9531-466d-ba0b-1df66ef0e70c	\N	\N	\N	Reunion de retroalimentacion a las 12	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-05-04	\N	\N	0	2026-05-04 17:30:55.271867+00	2026-05-04 17:30:55.271867+00
37dfa1b1-8323-4bf2-b4f5-3ccdf53723d4	1	1bc9d6ed-9dd4-4e6e-b360-244b415b818f	\N	\N	\N	Negociar mayoreo TVC	\N	backlog	alta	60ce5ac5-9ee2-427d-98c5-f7ef2ee556f3	60ce5ac5-9ee2-427d-98c5-f7ef2ee556f3	2026-05-12	\N	\N	0	2026-05-07 13:35:59.973661+00	2026-05-07 13:35:59.973661+00
8eba31f9-aea0-4f13-a14d-3267f7e3c839	1	f510a515-f9b5-41d2-ae13-288afe2ae69f	\N	\N	\N	Integrar in link de facturacion al sitio	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-21	\N	\N	0	2026-05-01 16:10:20.271717+00	2026-05-01 16:10:26.091177+00
39e7b44c-eac7-4504-8fe4-26f67e2ed45c	15	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	f5227599-800c-4443-af2b-f217168ac169	\N	\N	Arreglar el porque no se agregan epicas en Cycles	\N	en_revision	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-28	\N	\N	0	2026-04-27 16:40:14.397808+00	2026-05-01 16:22:50.187631+00
856859f7-0082-4d0b-a2ea-0f3527b5afa5	31	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	32659c70-ccc3-4f0d-b444-759e14237e01	\N	\N	correcion a vista de inicio en laptop	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-05-01	\N	\N	0	2026-05-01 16:30:39.626668+00	2026-05-01 16:30:39.626668+00
0d650403-0f00-47cc-b71e-e90158d2d28f	35	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	64526d6a-6cfa-4f1c-8a52-c2ac8b241fcb	\N	\N	Definir esquema de modificaciones	\N	backlog	baja	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-05-11	\N	\N	0	2026-05-01 16:44:18.139288+00	2026-05-01 16:44:18.139288+00
9d54ab7d-67aa-4366-b858-818b4aaf324e	38	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	32659c70-ccc3-4f0d-b444-759e14237e01	\N	\N	Corregir que no se muestras los wokspace	\N	backlog	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-05-01	\N	\N	0	2026-05-01 16:58:13.810863+00	2026-05-01 16:58:13.810863+00
b8462654-6b24-4ba7-8763-974f148911b5	1	465c5160-21c0-4ea0-82b8-71cd32fcd21d	\N	\N	\N	Planeacion de proyecto	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-05-04	\N	\N	0	2026-05-01 17:05:09.661054+00	2026-05-01 17:05:09.661054+00
59c0c875-efc0-43fe-89fb-cbe8f4f1c3c1	2	1bc9d6ed-9dd4-4e6e-b360-244b415b818f	\N	\N	\N	Negociar mayoreo Con Exel Solar	\N	backlog	alta	60ce5ac5-9ee2-427d-98c5-f7ef2ee556f3	60ce5ac5-9ee2-427d-98c5-f7ef2ee556f3	2026-05-12	\N	\N	0	2026-05-07 13:36:23.155858+00	2026-05-07 13:36:23.155858+00
b352a3a7-4e56-44be-b0a6-c592336c184e	3	1bc9d6ed-9dd4-4e6e-b360-244b415b818f	\N	\N	\N	Armado de Kits de herramientas por Rubro	\N	backlog	alta	60ce5ac5-9ee2-427d-98c5-f7ef2ee556f3	60ce5ac5-9ee2-427d-98c5-f7ef2ee556f3	2026-05-12	\N	\N	0	2026-05-07 13:36:48.175617+00	2026-05-07 13:36:48.175617+00
2946d846-bff1-4ba8-920e-969b56ada811	4	1bc9d6ed-9dd4-4e6e-b360-244b415b818f	\N	\N	\N	Declaracion del Sat	\N	backlog	alta	60ce5ac5-9ee2-427d-98c5-f7ef2ee556f3	60ce5ac5-9ee2-427d-98c5-f7ef2ee556f3	2026-05-12	\N	\N	0	2026-05-07 13:37:02.244674+00	2026-05-07 13:37:02.244674+00
663b015c-0a25-44f9-bf5f-c47c9e216968	53	4f13a9e6-930d-45e8-9f68-acccef604a9d	6f29f909-98c9-4a27-909e-1111ccac4c3a	9ad22747-cf29-4ad9-a099-56d5c06354a8	\N	Sidebar fijo izquierda con secciones Colores, Logos, Contenido, Historial (ítem activo con accent color)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-11	\N	\N	0	2026-04-24 16:37:19.752526+00	2026-05-01 17:22:16.090805+00
202a10f9-025c-477b-b91c-18c7086e2892	42	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	32659c70-ccc3-4f0d-b444-759e14237e01	\N	\N	Lógica para que se eliminen tareas en sesión de inicio si ya están completadas	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-05-05	\N	\N	0	2026-05-05 04:40:45.063822+00	2026-05-05 04:40:45.063822+00
b4f3f1de-88f2-4fef-bb85-6aeedb416c33	1	13c4e56a-fc1e-4f80-9a19-ba68f3f5379d	\N	\N	\N	Directorio de equipos CCTV por clientes	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	60ce5ac5-9ee2-427d-98c5-f7ef2ee556f3	2026-05-30	\N	\N	0	2026-05-07 13:39:03.812426+00	2026-05-07 13:39:03.812426+00
4f66cda8-5fa2-4e1c-942f-28a681627d17	1	37beb68d-3baf-4a1b-8d51-3e1b6539140f	\N	\N	\N	Iniciamos planeacion el 12 de mayo	\N	backlog	media	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-05-12	\N	\N	0	2026-05-01 16:11:20.554888+00	2026-05-01 16:11:20.554888+00
34a96968-5f9f-4ae2-a9bf-eabe2ddc63a8	32	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	56a2ceb8-5331-43ce-9c9c-58fb91591a28	\N	\N	Conectar discord a Fow	\N	backlog	baja	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-05-09	\N	\N	0	2026-05-01 16:37:24.742398+00	2026-05-01 16:37:24.742398+00
ca15934b-61a6-4042-9fc9-9b6ce86c01c9	36	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	\N	\N	\N	cuando ingresas a aplicacion la seccion de wokspace aparezcan replegados	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-05-06	\N	\N	0	2026-05-01 16:46:10.732604+00	2026-05-01 16:46:10.732604+00
c730ac54-0f24-4011-a833-c5a012298be7	39	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	fae89dc3-6b18-400f-b04c-bd94a1381d99	\N	\N	crear landingpage	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-05-06	\N	\N	0	2026-05-01 17:00:38.254223+00	2026-05-01 17:00:38.254223+00
c75f2d47-1297-449c-acf2-726daaa72c0e	40	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	fae89dc3-6b18-400f-b04c-bd94a1381d99	\N	\N	crear formulario de creacion de cuenta	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-05-06	\N	\N	0	2026-05-01 17:01:02.100306+00	2026-05-01 17:01:02.100306+00
4f49c550-2875-4327-831f-856868637a45	71	4f13a9e6-930d-45e8-9f68-acccef604a9d	35505d6c-26c7-4ac2-8720-9b0378cb999b	\N	\N	Dashboard: layout sidebar fijo + área principal, cards de sitios con badges	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-03	\N	\N	0	2026-04-24 16:37:20.574019+00	2026-05-01 17:07:10.092548+00
938eafe8-3f1c-4fb4-b13e-359a3cfb2631	75	4f13a9e6-930d-45e8-9f68-acccef604a9d	35505d6c-26c7-4ac2-8720-9b0378cb999b	\N	\N	Zona drag and drop de logos con previsualización y estado de error (tipo inválido, excede 2MB)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-05-03	\N	\N	0	2026-04-24 16:37:20.756099+00	2026-05-01 17:07:38.322797+00
\.


--
-- Data for Name: user_notification_prefs; Type: TABLE DATA; Schema: public; Owner: rxcode_dba
--

COPY public.user_notification_prefs (user_id, mentions, assignments, comments, updates, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: rxcode_dba
--

COPY public.users (id, name, email, password_hash, role, initials, avatar_url, last_seen_at, is_active, created_at, updated_at, avatar_color, presence_status) FROM stdin;
ec88a68e-5a20-402b-bd82-4dd854ce7fbf	Ana Núñez	ana@rxflow.io	$2b$10$uyj02rKmNNht/BsnK4CSE.g0uF7y1wStQnYD/8xHxjeeQYQMxQNkq	admin	AN	\N	\N	f	2026-04-21 23:19:08.4382+00	2026-04-22 13:13:29.055559+00	\N	offline
fac2efa8-e7aa-4dbf-8c93-bec6df3fe54e	Juan Ríos	juan@rxflow.io	$2b$10$uyj02rKmNNht/BsnK4CSE.g0uF7y1wStQnYD/8xHxjeeQYQMxQNkq	member	JR	\N	\N	f	2026-04-21 23:19:08.4382+00	2026-04-22 13:13:35.539563+00	\N	offline
dc67abc3-0181-4e89-ac27-4618553832d0	Luis Mora	luis@rxflow.io	$2b$10$uyj02rKmNNht/BsnK4CSE.g0uF7y1wStQnYD/8xHxjeeQYQMxQNkq	member	LM	\N	\N	f	2026-04-21 23:19:08.4382+00	2026-04-22 13:13:41.650811+00	\N	offline
1b827dbe-7d8e-41c4-bde2-3ab6c8e8cb0b	Sara Castro	sara@rxflow.io	$2b$10$uyj02rKmNNht/BsnK4CSE.g0uF7y1wStQnYD/8xHxjeeQYQMxQNkq	member	SC	\N	\N	f	2026-04-21 23:19:08.4382+00	2026-04-22 13:13:48.340162+00	\N	offline
d9e0a494-bc42-41ed-984d-967a44bf634e	fER	rectrack@gmail.com	$2b$10$aveP0nVbr3kE9YCNblZwA.8co/rUKEiaU3btsCZoLx00QuO5Y/KnK	member	F	\N	\N	t	2026-04-22 18:14:35.670856+00	2026-04-22 18:14:35.670856+00	\N	offline
a33369e7-d635-4d23-9df5-03754d46afb6	Abigail	abigail.rxcode@gmail.com	$2b$10$gFm6iZIndaZlcpGcf7xUHeqNlKIRZThv8rH5i/mOlpT1gYE9EVc62	member	A	\N	\N	t	2026-04-24 13:16:07.445455+00	2026-04-24 13:16:07.445455+00	\N	offline
9cc69f1b-31d7-4c7b-b913-0070158ed2e3	TES	test@test.com	$2b$10$8RcfDc8D6e04c/JDsaUSaOv2o13HHrf1qnSL8qCdfa38i87OFJHZW	member	T	\N	2026-04-23 17:35:47.974091+00	t	2026-04-22 17:42:59.694446+00	2026-04-23 17:35:47.974091+00	#7c3aed	offline
880fce53-5d27-4c4d-9d1e-e8c1a74d6887	Michelle Ramirez	rxcode.pm@gmail.com	$2b$10$I.rZIZS6FutS/u0/jf2ofug7LXnoYEB0C5p.LPDvLLMk7pP5ujjaS	member	MR	\N	2026-05-07 15:55:27.936072+00	t	2026-04-22 12:52:40.369111+00	2026-05-07 15:55:27.936072+00	#111111	offline
a87077af-4d41-4ea3-a738-73ee9b84b9d3	Isaac Levi	levi.rxcode@gmail.com	$2b$10$Lx0FQnZbiB5dQOoWE.icEewFTEMpqGFg6Li7l8q7usYEsdbwLZFzW	member	IL	\N	2026-05-06 23:37:52.191778+00	t	2026-04-24 13:14:30.193549+00	2026-05-06 23:37:52.191778+00	\N	offline
a4724453-124c-45a3-a8c5-db01560300cc	Daniel Galicia	rxcode@gmail.com	$2b$10$9rX0Yq6y7M8v0XahoM5g9ew0uaSICShfpcO2dVsyxIPCfNBp4mHVS	member	DG	\N	2026-05-07 15:59:51.011335+00	t	2026-04-21 23:25:33.309135+00	2026-05-07 15:59:51.011335+00	#0891b2	online
60ce5ac5-9ee2-427d-98c5-f7ef2ee556f3	Ricardo Galicia	soporte.ricardo.galicia@rxcode.com	$2b$10$rk2y8E6R.TMZazrwcw6jnuIlWk61N10Ckusg03dwBfIPIQ3A9jytK	member	RG	\N	2026-05-07 13:47:55.637411+00	t	2026-05-02 17:03:13.792935+00	2026-05-07 13:47:55.637411+00	\N	online
\.


--
-- Data for Name: wiki_pages; Type: TABLE DATA; Schema: public; Owner: rxcode_dba
--

COPY public.wiki_pages (id, project_id, slug, title, content, author_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: workspace_members; Type: TABLE DATA; Schema: public; Owner: rxcode_dba
--

COPY public.workspace_members (workspace_id, user_id, added_at) FROM stdin;
f9d6edaf-e399-4d68-8fc9-ba40ec783d18	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-30 18:43:31.659202+00
4e703992-df0b-40fc-ac26-20bbce34c66e	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-30 18:43:31.659202+00
\.


--
-- Data for Name: workspace_projects; Type: TABLE DATA; Schema: public; Owner: rxcode_dba
--

COPY public.workspace_projects (workspace_id, project_id, added_at) FROM stdin;
f9d6edaf-e399-4d68-8fc9-ba40ec783d18	725a2211-9531-466d-ba0b-1df66ef0e70c	2026-04-22 13:38:54.031988+00
f9d6edaf-e399-4d68-8fc9-ba40ec783d18	f510a515-f9b5-41d2-ae13-288afe2ae69f	2026-04-22 13:39:04.971733+00
f9d6edaf-e399-4d68-8fc9-ba40ec783d18	37beb68d-3baf-4a1b-8d51-3e1b6539140f	2026-04-22 13:39:11.643174+00
4e703992-df0b-40fc-ac26-20bbce34c66e	027fa9f0-f03f-4c18-970c-9374bace6e5b	2026-04-22 13:39:23.447343+00
4e703992-df0b-40fc-ac26-20bbce34c66e	bab1aa48-dc68-4165-8847-30e240091641	2026-04-22 13:39:27.473872+00
4e703992-df0b-40fc-ac26-20bbce34c66e	a092bc84-7294-4ce0-9261-d410e04c0359	2026-04-22 13:39:30.428708+00
4e703992-df0b-40fc-ac26-20bbce34c66e	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	2026-04-22 13:40:34.133253+00
4e703992-df0b-40fc-ac26-20bbce34c66e	d24e523f-8e3e-46e1-be30-f8271ceb610c	2026-04-22 13:43:23.602886+00
4e703992-df0b-40fc-ac26-20bbce34c66e	4f13a9e6-930d-45e8-9f68-acccef604a9d	2026-04-24 16:38:03.506038+00
4e703992-df0b-40fc-ac26-20bbce34c66e	c70b1f17-d0d0-4706-b77c-97ed59c954d5	2026-04-27 16:47:34.99904+00
4e703992-df0b-40fc-ac26-20bbce34c66e	2b3e7ea3-1d8c-40c8-949f-542542aac626	2026-04-28 16:55:37.869657+00
\.


--
-- Data for Name: workspaces; Type: TABLE DATA; Schema: public; Owner: rxcode_dba
--

COPY public.workspaces (id, name, description, color, icon, created_by, created_at, updated_at, license_id) FROM stdin;
f9d6edaf-e399-4d68-8fc9-ba40ec783d18	RecTrack	Proyectos de cliente con convenio	#ef4444	layers	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22 13:37:33.086965+00	2026-04-22 13:37:33.086965+00	\N
4e703992-df0b-40fc-ac26-20bbce34c66e	Rxcode	Proyectos internos	#3b82f6	code	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22 13:38:11.940298+00	2026-04-22 13:38:11.940298+00	\N
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: activity_log activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: cycles cycles_pkey; Type: CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.cycles
    ADD CONSTRAINT cycles_pkey PRIMARY KEY (id);


--
-- Name: cycles cycles_project_id_number_key; Type: CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.cycles
    ADD CONSTRAINT cycles_project_id_number_key UNIQUE (project_id, number);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: epics epics_pkey; Type: CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.epics
    ADD CONSTRAINT epics_pkey PRIMARY KEY (id);


--
-- Name: integrations integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.integrations
    ADD CONSTRAINT integrations_pkey PRIMARY KEY (id);


--
-- Name: integrations integrations_provider_key; Type: CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.integrations
    ADD CONSTRAINT integrations_provider_key UNIQUE (provider);


--
-- Name: labels labels_pkey; Type: CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.labels
    ADD CONSTRAINT labels_pkey PRIMARY KEY (id);


--
-- Name: labels labels_project_id_name_key; Type: CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.labels
    ADD CONSTRAINT labels_project_id_name_key UNIQUE (project_id, name);


--
-- Name: license_members license_members_pkey; Type: CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.license_members
    ADD CONSTRAINT license_members_pkey PRIMARY KEY (license_id, user_id);


--
-- Name: licenses licenses_pkey; Type: CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.licenses
    ADD CONSTRAINT licenses_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: project_members project_members_pkey; Type: CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_pkey PRIMARY KEY (project_id, user_id);


--
-- Name: project_task_sequences project_task_sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.project_task_sequences
    ADD CONSTRAINT project_task_sequences_pkey PRIMARY KEY (project_id);


--
-- Name: projects projects_code_key; Type: CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_code_key UNIQUE (code);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: task_labels task_labels_pkey; Type: CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.task_labels
    ADD CONSTRAINT task_labels_pkey PRIMARY KEY (task_id, label_id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_project_id_sequential_id_key; Type: CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_project_id_sequential_id_key UNIQUE (project_id, sequential_id);


--
-- Name: user_notification_prefs user_notification_prefs_pkey; Type: CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.user_notification_prefs
    ADD CONSTRAINT user_notification_prefs_pkey PRIMARY KEY (user_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: wiki_pages wiki_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.wiki_pages
    ADD CONSTRAINT wiki_pages_pkey PRIMARY KEY (id);


--
-- Name: wiki_pages wiki_pages_project_id_slug_key; Type: CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.wiki_pages
    ADD CONSTRAINT wiki_pages_project_id_slug_key UNIQUE (project_id, slug);


--
-- Name: workspace_members workspace_members_pkey; Type: CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT workspace_members_pkey PRIMARY KEY (workspace_id, user_id);


--
-- Name: workspace_projects workspace_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.workspace_projects
    ADD CONSTRAINT workspace_projects_pkey PRIMARY KEY (workspace_id, project_id);


--
-- Name: workspaces workspaces_pkey; Type: CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_pkey PRIMARY KEY (id);


--
-- Name: idx_activity_created; Type: INDEX; Schema: public; Owner: rxcode_dba
--

CREATE INDEX idx_activity_created ON public.activity_log USING btree (created_at DESC);


--
-- Name: idx_activity_project; Type: INDEX; Schema: public; Owner: rxcode_dba
--

CREATE INDEX idx_activity_project ON public.activity_log USING btree (project_id) WHERE (project_id IS NOT NULL);


--
-- Name: idx_activity_task; Type: INDEX; Schema: public; Owner: rxcode_dba
--

CREATE INDEX idx_activity_task ON public.activity_log USING btree (task_id) WHERE (task_id IS NOT NULL);


--
-- Name: idx_activity_user; Type: INDEX; Schema: public; Owner: rxcode_dba
--

CREATE INDEX idx_activity_user ON public.activity_log USING btree (user_id);


--
-- Name: idx_comments_author; Type: INDEX; Schema: public; Owner: rxcode_dba
--

CREATE INDEX idx_comments_author ON public.comments USING btree (author_id);


--
-- Name: idx_comments_task; Type: INDEX; Schema: public; Owner: rxcode_dba
--

CREATE INDEX idx_comments_task ON public.comments USING btree (task_id);


--
-- Name: idx_cycles_project; Type: INDEX; Schema: public; Owner: rxcode_dba
--

CREATE INDEX idx_cycles_project ON public.cycles USING btree (project_id);


--
-- Name: idx_cycles_status; Type: INDEX; Schema: public; Owner: rxcode_dba
--

CREATE INDEX idx_cycles_status ON public.cycles USING btree (status);


--
-- Name: idx_documents_project; Type: INDEX; Schema: public; Owner: rxcode_dba
--

CREATE INDEX idx_documents_project ON public.documents USING btree (project_id) WHERE (project_id IS NOT NULL);


--
-- Name: idx_epics_parent; Type: INDEX; Schema: public; Owner: rxcode_dba
--

CREATE INDEX idx_epics_parent ON public.epics USING btree (parent_epic_id);


--
-- Name: idx_epics_project; Type: INDEX; Schema: public; Owner: rxcode_dba
--

CREATE INDEX idx_epics_project ON public.epics USING btree (project_id);


--
-- Name: idx_epics_status; Type: INDEX; Schema: public; Owner: rxcode_dba
--

CREATE INDEX idx_epics_status ON public.epics USING btree (status);


--
-- Name: idx_notifications_created; Type: INDEX; Schema: public; Owner: rxcode_dba
--

CREATE INDEX idx_notifications_created ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_recipient; Type: INDEX; Schema: public; Owner: rxcode_dba
--

CREATE INDEX idx_notifications_recipient ON public.notifications USING btree (recipient_id);


--
-- Name: idx_notifications_unread; Type: INDEX; Schema: public; Owner: rxcode_dba
--

CREATE INDEX idx_notifications_unread ON public.notifications USING btree (recipient_id) WHERE (read = false);


--
-- Name: idx_project_members_user; Type: INDEX; Schema: public; Owner: rxcode_dba
--

CREATE INDEX idx_project_members_user ON public.project_members USING btree (user_id);


--
-- Name: idx_projects_created_by; Type: INDEX; Schema: public; Owner: rxcode_dba
--

CREATE INDEX idx_projects_created_by ON public.projects USING btree (created_by);


--
-- Name: idx_projects_status; Type: INDEX; Schema: public; Owner: rxcode_dba
--

CREATE INDEX idx_projects_status ON public.projects USING btree (status);


--
-- Name: idx_tasks_assignee; Type: INDEX; Schema: public; Owner: rxcode_dba
--

CREATE INDEX idx_tasks_assignee ON public.tasks USING btree (assignee_id);


--
-- Name: idx_tasks_cycle; Type: INDEX; Schema: public; Owner: rxcode_dba
--

CREATE INDEX idx_tasks_cycle ON public.tasks USING btree (cycle_id);


--
-- Name: idx_tasks_due_date; Type: INDEX; Schema: public; Owner: rxcode_dba
--

CREATE INDEX idx_tasks_due_date ON public.tasks USING btree (due_date) WHERE (due_date IS NOT NULL);


--
-- Name: idx_tasks_epic; Type: INDEX; Schema: public; Owner: rxcode_dba
--

CREATE INDEX idx_tasks_epic ON public.tasks USING btree (epic_id);


--
-- Name: idx_tasks_parent; Type: INDEX; Schema: public; Owner: rxcode_dba
--

CREATE INDEX idx_tasks_parent ON public.tasks USING btree (parent_task_id);


--
-- Name: idx_tasks_project; Type: INDEX; Schema: public; Owner: rxcode_dba
--

CREATE INDEX idx_tasks_project ON public.tasks USING btree (project_id);


--
-- Name: idx_tasks_status; Type: INDEX; Schema: public; Owner: rxcode_dba
--

CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: rxcode_dba
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_is_active; Type: INDEX; Schema: public; Owner: rxcode_dba
--

CREATE INDEX idx_users_is_active ON public.users USING btree (is_active);


--
-- Name: idx_wiki_project; Type: INDEX; Schema: public; Owner: rxcode_dba
--

CREATE INDEX idx_wiki_project ON public.wiki_pages USING btree (project_id) WHERE (project_id IS NOT NULL);


--
-- Name: comments trg_comments_updated_at; Type: TRIGGER; Schema: public; Owner: rxcode_dba
--

CREATE TRIGGER trg_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: cycles trg_cycles_updated_at; Type: TRIGGER; Schema: public; Owner: rxcode_dba
--

CREATE TRIGGER trg_cycles_updated_at BEFORE UPDATE ON public.cycles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: documents trg_documents_updated_at; Type: TRIGGER; Schema: public; Owner: rxcode_dba
--

CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: epics trg_epics_updated_at; Type: TRIGGER; Schema: public; Owner: rxcode_dba
--

CREATE TRIGGER trg_epics_updated_at BEFORE UPDATE ON public.epics FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: integrations trg_integrations_updated_at; Type: TRIGGER; Schema: public; Owner: rxcode_dba
--

CREATE TRIGGER trg_integrations_updated_at BEFORE UPDATE ON public.integrations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: projects trg_projects_updated_at; Type: TRIGGER; Schema: public; Owner: rxcode_dba
--

CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: tasks trg_tasks_sequential_id; Type: TRIGGER; Schema: public; Owner: rxcode_dba
--

CREATE TRIGGER trg_tasks_sequential_id BEFORE INSERT ON public.tasks FOR EACH ROW WHEN (((new.sequential_id IS NULL) OR (new.sequential_id = 0))) EXECUTE FUNCTION public.assign_task_sequential_id();


--
-- Name: tasks trg_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: rxcode_dba
--

CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: users trg_users_updated_at; Type: TRIGGER; Schema: public; Owner: rxcode_dba
--

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: wiki_pages trg_wiki_updated_at; Type: TRIGGER; Schema: public; Owner: rxcode_dba
--

CREATE TRIGGER trg_wiki_updated_at BEFORE UPDATE ON public.wiki_pages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: workspaces trg_workspaces_updated_at; Type: TRIGGER; Schema: public; Owner: rxcode_dba
--

CREATE TRIGGER trg_workspaces_updated_at BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: activity_log activity_log_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: activity_log activity_log_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: activity_log activity_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: comments comments_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: comments comments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: cycles cycles_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.cycles
    ADD CONSTRAINT cycles_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: documents documents_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: documents documents_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: epics epics_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.epics
    ADD CONSTRAINT epics_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: epics epics_parent_epic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.epics
    ADD CONSTRAINT epics_parent_epic_id_fkey FOREIGN KEY (parent_epic_id) REFERENCES public.epics(id) ON DELETE SET NULL;


--
-- Name: epics epics_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.epics
    ADD CONSTRAINT epics_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: integrations integrations_connected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.integrations
    ADD CONSTRAINT integrations_connected_by_fkey FOREIGN KEY (connected_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: labels labels_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.labels
    ADD CONSTRAINT labels_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: license_members license_members_license_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.license_members
    ADD CONSTRAINT license_members_license_id_fkey FOREIGN KEY (license_id) REFERENCES public.licenses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: license_members license_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.license_members
    ADD CONSTRAINT license_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: licenses licenses_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.licenses
    ADD CONSTRAINT licenses_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: notifications notifications_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- Name: notifications notifications_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: project_members project_members_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: project_members project_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: project_task_sequences project_task_sequences_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.project_task_sequences
    ADD CONSTRAINT project_task_sequences_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: projects projects_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: task_labels task_labels_label_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.task_labels
    ADD CONSTRAINT task_labels_label_id_fkey FOREIGN KEY (label_id) REFERENCES public.labels(id) ON DELETE CASCADE;


--
-- Name: task_labels task_labels_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.task_labels
    ADD CONSTRAINT task_labels_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_assignee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: tasks tasks_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_cycle_id_fkey FOREIGN KEY (cycle_id) REFERENCES public.cycles(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_epic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_epic_id_fkey FOREIGN KEY (epic_id) REFERENCES public.epics(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_parent_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_parent_task_id_fkey FOREIGN KEY (parent_task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: user_notification_prefs user_notification_prefs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.user_notification_prefs
    ADD CONSTRAINT user_notification_prefs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: wiki_pages wiki_pages_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.wiki_pages
    ADD CONSTRAINT wiki_pages_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: wiki_pages wiki_pages_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.wiki_pages
    ADD CONSTRAINT wiki_pages_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: workspace_members workspace_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT workspace_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: workspace_members workspace_members_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT workspace_members_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: workspace_projects workspace_projects_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.workspace_projects
    ADD CONSTRAINT workspace_projects_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: workspace_projects workspace_projects_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.workspace_projects
    ADD CONSTRAINT workspace_projects_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: workspaces workspaces_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: workspaces workspaces_license_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxcode_dba
--

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_license_id_fkey FOREIGN KEY (license_id) REFERENCES public.licenses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict NjfnCKWQf6V1818QW9yg2M8lWTJESUJL4nbMzA6lqysa9MJ4LO9wtW4BLfeKF3D

