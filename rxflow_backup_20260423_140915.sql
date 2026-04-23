--
-- PostgreSQL database dump
--

\restrict ClhDytEprVRSuIgIHWjSd2IyP3Desq6bP1dkfaSidSUeX7RXUxnNWaPvZSUkw5O

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
-- Name: cycle_status_enum; Type: TYPE; Schema: public; Owner: rxflow
--

CREATE TYPE public.cycle_status_enum AS ENUM (
    'planificado',
    'activo',
    'completado'
);


ALTER TYPE public.cycle_status_enum OWNER TO rxflow;

--
-- Name: epic_status_enum; Type: TYPE; Schema: public; Owner: rxflow
--

CREATE TYPE public.epic_status_enum AS ENUM (
    'activa',
    'completada',
    'archivada'
);


ALTER TYPE public.epic_status_enum OWNER TO rxflow;

--
-- Name: integration_status_enum; Type: TYPE; Schema: public; Owner: rxflow
--

CREATE TYPE public.integration_status_enum AS ENUM (
    'conectado',
    'desconectado'
);


ALTER TYPE public.integration_status_enum OWNER TO rxflow;

--
-- Name: member_role_enum; Type: TYPE; Schema: public; Owner: rxflow
--

CREATE TYPE public.member_role_enum AS ENUM (
    'owner',
    'admin',
    'member',
    'viewer'
);


ALTER TYPE public.member_role_enum OWNER TO rxflow;

--
-- Name: methodology_enum; Type: TYPE; Schema: public; Owner: rxflow
--

CREATE TYPE public.methodology_enum AS ENUM (
    'scrum',
    'kanban',
    'shape_up'
);


ALTER TYPE public.methodology_enum OWNER TO rxflow;

--
-- Name: notification_type_enum; Type: TYPE; Schema: public; Owner: rxflow
--

CREATE TYPE public.notification_type_enum AS ENUM (
    'mention',
    'asignado',
    'comentario',
    'completado',
    'bloqueado'
);


ALTER TYPE public.notification_type_enum OWNER TO rxflow;

--
-- Name: presence_enum; Type: TYPE; Schema: public; Owner: rxflow
--

CREATE TYPE public.presence_enum AS ENUM (
    'online',
    'away',
    'offline'
);


ALTER TYPE public.presence_enum OWNER TO rxflow;

--
-- Name: priority_enum; Type: TYPE; Schema: public; Owner: rxflow
--

CREATE TYPE public.priority_enum AS ENUM (
    'urgente',
    'alta',
    'media',
    'baja'
);


ALTER TYPE public.priority_enum OWNER TO rxflow;

--
-- Name: project_status_enum; Type: TYPE; Schema: public; Owner: rxflow
--

CREATE TYPE public.project_status_enum AS ENUM (
    'activo',
    'pausado',
    'archivado'
);


ALTER TYPE public.project_status_enum OWNER TO rxflow;

--
-- Name: task_status_enum; Type: TYPE; Schema: public; Owner: rxflow
--

CREATE TYPE public.task_status_enum AS ENUM (
    'backlog',
    'en_progreso',
    'en_revision',
    'bloqueado',
    'completada'
);


ALTER TYPE public.task_status_enum OWNER TO rxflow;

--
-- Name: assign_task_sequential_id(); Type: FUNCTION; Schema: public; Owner: rxflow
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


ALTER FUNCTION public.assign_task_sequential_id() OWNER TO rxflow;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: rxflow
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO rxflow;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_log; Type: TABLE; Schema: public; Owner: rxflow
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


ALTER TABLE public.activity_log OWNER TO rxflow;

--
-- Name: comments; Type: TABLE; Schema: public; Owner: rxflow
--

CREATE TABLE public.comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    author_id uuid NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.comments OWNER TO rxflow;

--
-- Name: cycles; Type: TABLE; Schema: public; Owner: rxflow
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


ALTER TABLE public.cycles OWNER TO rxflow;

--
-- Name: documents; Type: TABLE; Schema: public; Owner: rxflow
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


ALTER TABLE public.documents OWNER TO rxflow;

--
-- Name: epics; Type: TABLE; Schema: public; Owner: rxflow
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


ALTER TABLE public.epics OWNER TO rxflow;

--
-- Name: integrations; Type: TABLE; Schema: public; Owner: rxflow
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


ALTER TABLE public.integrations OWNER TO rxflow;

--
-- Name: labels; Type: TABLE; Schema: public; Owner: rxflow
--

CREATE TABLE public.labels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    name character varying(50) NOT NULL,
    color character varying(7) DEFAULT '#6b7280'::character varying NOT NULL
);


ALTER TABLE public.labels OWNER TO rxflow;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: rxflow
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


ALTER TABLE public.notifications OWNER TO rxflow;

--
-- Name: project_members; Type: TABLE; Schema: public; Owner: rxflow
--

CREATE TABLE public.project_members (
    project_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role public.member_role_enum DEFAULT 'member'::public.member_role_enum NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.project_members OWNER TO rxflow;

--
-- Name: project_task_sequences; Type: TABLE; Schema: public; Owner: rxflow
--

CREATE TABLE public.project_task_sequences (
    project_id uuid NOT NULL,
    last_seq integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.project_task_sequences OWNER TO rxflow;

--
-- Name: projects; Type: TABLE; Schema: public; Owner: rxflow
--

CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(4) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    methodology public.methodology_enum DEFAULT 'kanban'::public.methodology_enum NOT NULL,
    status public.project_status_enum DEFAULT 'activo'::public.project_status_enum NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    extra_views jsonb DEFAULT '[]'::jsonb NOT NULL
);


ALTER TABLE public.projects OWNER TO rxflow;

--
-- Name: task_labels; Type: TABLE; Schema: public; Owner: rxflow
--

CREATE TABLE public.task_labels (
    task_id uuid NOT NULL,
    label_id uuid NOT NULL
);


ALTER TABLE public.task_labels OWNER TO rxflow;

--
-- Name: tasks; Type: TABLE; Schema: public; Owner: rxflow
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


ALTER TABLE public.tasks OWNER TO rxflow;

--
-- Name: user_notification_prefs; Type: TABLE; Schema: public; Owner: rxflow
--

CREATE TABLE public.user_notification_prefs (
    user_id uuid NOT NULL,
    mentions boolean DEFAULT true NOT NULL,
    assignments boolean DEFAULT true NOT NULL,
    comments boolean DEFAULT false NOT NULL,
    updates boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_notification_prefs OWNER TO rxflow;

--
-- Name: users; Type: TABLE; Schema: public; Owner: rxflow
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'member'::character varying NOT NULL,
    initials character varying(4) NOT NULL,
    avatar_url character varying(500),
    presence_status public.presence_enum DEFAULT 'offline'::public.presence_enum NOT NULL,
    last_seen_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    avatar_color character varying(20)
);


ALTER TABLE public.users OWNER TO rxflow;

--
-- Name: wiki_pages; Type: TABLE; Schema: public; Owner: rxflow
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


ALTER TABLE public.wiki_pages OWNER TO rxflow;

--
-- Name: workspace_members; Type: TABLE; Schema: public; Owner: rxflow
--

CREATE TABLE public.workspace_members (
    workspace_id uuid NOT NULL,
    user_id uuid NOT NULL,
    added_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.workspace_members OWNER TO rxflow;

--
-- Name: workspace_projects; Type: TABLE; Schema: public; Owner: rxflow
--

CREATE TABLE public.workspace_projects (
    workspace_id uuid NOT NULL,
    project_id uuid NOT NULL,
    added_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.workspace_projects OWNER TO rxflow;

--
-- Name: workspaces; Type: TABLE; Schema: public; Owner: rxflow
--

CREATE TABLE public.workspaces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    color text DEFAULT '#6366f1'::text NOT NULL,
    icon text DEFAULT 'layers'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.workspaces OWNER TO rxflow;

--
-- Data for Name: activity_log; Type: TABLE DATA; Schema: public; Owner: rxflow
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
63ba6fec-fd1f-40a3-9e4a-d89ee53b2238	14e312d4-fd5a-45dc-adc1-3ee7b8371e48	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	asignó una épica	\N	2026-04-23 13:54:46.81626+00
\.


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: rxflow
--

COPY public.comments (id, task_id, author_id, body, created_at, updated_at) FROM stdin;
150d9977-9eea-48a8-8ed8-100daa6a53bb	95d6f892-272d-4772-b046-11ae106b031e	a4724453-124c-45a3-a8c5-db01560300cc	@Michelle Ramirez  holi esto es una prueba de las notificaciones	2026-04-22 17:26:19.415675+00	2026-04-22 17:26:19.415675+00
f6c2305f-ac42-47d7-b6c8-d8a64b77b608	95d6f892-272d-4772-b046-11ae106b031e	a4724453-124c-45a3-a8c5-db01560300cc	jajaja falta lo de poder editar y eliminar se me olvido	2026-04-22 17:42:17.191008+00	2026-04-22 17:42:17.191008+00
360994c6-725a-4815-a0c1-65537b9f5b25	95d6f892-272d-4772-b046-11ae106b031e	a4724453-124c-45a3-a8c5-db01560300cc	@Daniel Galicia Prueba de auto llamado	2026-04-22 17:42:35.077289+00	2026-04-22 17:42:35.077289+00
09414411-281c-42a5-9508-9c2720a00c60	b36767be-07c0-41ea-b37f-5cbb410ea14e	9cc69f1b-31d7-4c7b-b913-0070158ed2e3	@Daniel Galicia Funciona?	2026-04-22 17:43:45.492409+00	2026-04-22 17:43:45.492409+00
\.


--
-- Data for Name: cycles; Type: TABLE DATA; Schema: public; Owner: rxflow
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
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: rxflow
--

COPY public.documents (id, project_id, title, body, author_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: epics; Type: TABLE DATA; Schema: public; Owner: rxflow
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
a8429cb9-aa5b-4e15-b831-320d624c0fb2	f90bd0b9-1c42-4d10-8533-a9a7359ff8f7	Integraciones	-	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22 21:31:43.576101+00	2026-04-22 21:31:43.576101+00	\N
a9061d79-3e0c-4db5-b23c-b647affd5a4d	f90bd0b9-1c42-4d10-8533-a9a7359ff8f7	Funcionales	-	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22 21:32:07.018705+00	2026-04-22 21:32:07.018705+00	\N
8da25458-368d-4a9c-b5cd-7b680ea7d461	f90bd0b9-1c42-4d10-8533-a9a7359ff8f7	Animacion	\N	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22 21:32:17.608355+00	2026-04-22 21:32:17.608355+00	\N
059ad665-46ef-47a8-a5d4-ec7613b8e227	f90bd0b9-1c42-4d10-8533-a9a7359ff8f7	Diseno	-	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22 21:33:07.60066+00	2026-04-22 21:33:50.063514+00	\N
c82feaca-0325-4a15-b1f8-08b4651af0d1	f90bd0b9-1c42-4d10-8533-a9a7359ff8f7	Protipo de cobro y almacen	Genera con claude o gpt un mockup y mandarlo	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22 21:31:08.858358+00	2026-04-22 21:33:50.271848+00	059ad665-46ef-47a8-a5d4-ec7613b8e227
69c1504d-227f-4927-aa2a-11384ad951f3	f004e31b-991f-402e-96ff-a97f800653af	Login / Autenticación	\N	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23 13:25:37.425952+00	2026-04-23 13:25:37.425952+00	f08efedd-4aff-492d-a337-074f1d7e38fd
f08efedd-4aff-492d-a337-074f1d7e38fd	f004e31b-991f-402e-96ff-a97f800653af	Funcionales	Fronted	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23 13:24:44.308121+00	2026-04-23 13:25:37.581196+00	69c1504d-227f-4927-aa2a-11384ad951f3
5de321cd-5db2-4e2d-8189-7db41ae73318	f004e31b-991f-402e-96ff-a97f800653af	Panel de administración	Marcas y detalles del sitio	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23 13:27:13.078923+00	2026-04-23 13:27:13.078923+00	f08efedd-4aff-492d-a337-074f1d7e38fd
7f8ff9cf-61ca-46b5-88df-dd8f5f5e647f	f004e31b-991f-402e-96ff-a97f800653af	Barra lateral izquierda	\N	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23 13:29:19.307511+00	2026-04-23 13:29:19.307511+00	f08efedd-4aff-492d-a337-074f1d7e38fd
68fb1fbe-315d-4156-8f08-b56bae5bc63c	f004e31b-991f-402e-96ff-a97f800653af	Gestión de contenido	\N	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23 13:29:41.240042+00	2026-04-23 13:29:41.240042+00	f08efedd-4aff-492d-a337-074f1d7e38fd
8e2b630a-3562-479a-9fbd-bd93cf45a810	f004e31b-991f-402e-96ff-a97f800653af	Sistema de temas dinámico	\N	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23 13:32:06.071832+00	2026-04-23 13:32:06.071832+00	f08efedd-4aff-492d-a337-074f1d7e38fd
b6d6df56-d557-4545-af5c-52de9a49170e	f004e31b-991f-402e-96ff-a97f800653af	PRUEBA	sdaff	activa	\N	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-23 13:33:25.935913+00	2026-04-23 13:33:25.935913+00	\N
58322ca3-aab7-4e9e-b2be-76de0de16d8b	f004e31b-991f-402e-96ff-a97f800653af	Funcionales Backend	\N	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23 13:38:47.873082+00	2026-04-23 13:38:47.873082+00	\N
c2dd09aa-3c4c-43a2-ad30-76cfbb1186f1	f004e31b-991f-402e-96ff-a97f800653af	Login / Autenticación	\N	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23 13:40:07.891271+00	2026-04-23 13:40:07.891271+00	f08efedd-4aff-492d-a337-074f1d7e38fd
19401eed-bfc7-4d44-a99e-5164b1c66e92	f004e31b-991f-402e-96ff-a97f800653af	asfs	dafs	activa	\N	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-23 13:51:06.923566+00	2026-04-23 13:51:06.923566+00	f08efedd-4aff-492d-a337-074f1d7e38fd
820c0351-c3a8-4b8c-aab6-63468177f51a	f004e31b-991f-402e-96ff-a97f800653af	Gestión de sitios	\N	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23 13:54:03.989008+00	2026-04-23 13:54:03.989008+00	58322ca3-aab7-4e9e-b2be-76de0de16d8b
4650366c-d1e1-411d-abdd-94829d734a19	f004e31b-991f-402e-96ff-a97f800653af	Proxy / Conexión con sitios vía API	\N	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23 13:56:17.786222+00	2026-04-23 13:56:17.786222+00	58322ca3-aab7-4e9e-b2be-76de0de16d8b
3592eb43-8a20-44a0-a74e-bdb434937e42	f004e31b-991f-402e-96ff-a97f800653af	Gestión de archivos	\N	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23 13:58:22.120456+00	2026-04-23 13:58:22.120456+00	58322ca3-aab7-4e9e-b2be-76de0de16d8b
a553a1f5-1efc-4fe0-b495-f33f23e00642	f004e31b-991f-402e-96ff-a97f800653af	Historial de cambios	\N	activa	\N	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23 13:59:25.189803+00	2026-04-23 13:59:25.189803+00	58322ca3-aab7-4e9e-b2be-76de0de16d8b
\.


--
-- Data for Name: integrations; Type: TABLE DATA; Schema: public; Owner: rxflow
--

COPY public.integrations (id, provider, connected_as, access_token_enc, status, connected_by, connected_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: labels; Type: TABLE DATA; Schema: public; Owner: rxflow
--

COPY public.labels (id, project_id, name, color) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: rxflow
--

COPY public.notifications (id, recipient_id, sender_id, type, task_id, project_id, message, read, created_at) FROM stdin;
a92ea6a9-4e81-4aff-aaeb-c8e516365016	ec88a68e-5a20-402b-bd82-4dd854ce7fbf	ec88a68e-5a20-402b-bd82-4dd854ce7fbf	mention	\N	\N	Ana te mencionó en ENG-12	f	2026-04-21 23:19:08.4382+00
28159519-3b2c-456a-96d1-02fa6bf5ca2d	ec88a68e-5a20-402b-bd82-4dd854ce7fbf	dc67abc3-0181-4e89-ac27-4618553832d0	asignado	\N	\N	Luis te asignó ENG-18	f	2026-04-21 23:19:08.4382+00
47d7bb80-580d-4cb6-98eb-2470b1345c13	ec88a68e-5a20-402b-bd82-4dd854ce7fbf	1b827dbe-7d8e-41c4-bde2-3ab6c8e8cb0b	comentario	\N	\N	Sara comentó en DES-04	f	2026-04-21 23:19:08.4382+00
6e18f899-3b8a-474c-a925-756b93c5957c	ec88a68e-5a20-402b-bd82-4dd854ce7fbf	fac2efa8-e7aa-4dbf-8c93-bec6df3fe54e	comentario	\N	\N	Juan comentó en ENG-22	f	2026-04-21 23:19:08.4382+00
69f4369c-5505-4d71-968d-758fe05fa3ff	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	a4724453-124c-45a3-a8c5-db01560300cc	mention	95d6f892-272d-4772-b046-11ae106b031e	\N	te mencionó: "@Michelle Ramirez  holi esto es una prueba de las notificaci…"	f	2026-04-22 17:26:19.424381+00
388185f8-12b4-4824-876a-13e6984554b0	a4724453-124c-45a3-a8c5-db01560300cc	9cc69f1b-31d7-4c7b-b913-0070158ed2e3	mention	b36767be-07c0-41ea-b37f-5cbb410ea14e	\N	te mencionó: "@Daniel Galicia Funciona?"	f	2026-04-22 17:43:45.496767+00
\.


--
-- Data for Name: project_members; Type: TABLE DATA; Schema: public; Owner: rxflow
--

COPY public.project_members (project_id, user_id, role, joined_at) FROM stdin;
725a2211-9531-466d-ba0b-1df66ef0e70c	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	owner	2026-04-22 13:21:18.452859+00
f510a515-f9b5-41d2-ae13-288afe2ae69f	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	owner	2026-04-22 13:23:56.828375+00
37beb68d-3baf-4a1b-8d51-3e1b6539140f	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	owner	2026-04-22 13:26:07.439508+00
027fa9f0-f03f-4c18-970c-9374bace6e5b	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	owner	2026-04-22 13:27:27.61282+00
bab1aa48-dc68-4165-8847-30e240091641	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	owner	2026-04-22 13:28:24.189249+00
a092bc84-7294-4ce0-9261-d410e04c0359	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	owner	2026-04-22 13:29:48.773962+00
fedd8755-1935-4c0a-aefb-41dcf3ece4ef	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	owner	2026-04-22 13:40:33.962397+00
d24e523f-8e3e-46e1-be30-f8271ceb610c	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	owner	2026-04-22 13:43:23.444942+00
f004e31b-991f-402e-96ff-a97f800653af	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	owner	2026-04-22 16:09:23.675583+00
f90bd0b9-1c42-4d10-8533-a9a7359ff8f7	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	owner	2026-04-22 21:29:51.337602+00
\.


--
-- Data for Name: project_task_sequences; Type: TABLE DATA; Schema: public; Owner: rxflow
--

COPY public.project_task_sequences (project_id, last_seq) FROM stdin;
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: rxflow
--

COPY public.projects (id, code, name, description, methodology, status, created_by, created_at, updated_at, extra_views) FROM stdin;
725a2211-9531-466d-ba0b-1df66ef0e70c	FTL	Futool e-comerce	e-comerce	scrum	activo	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22 13:21:18.449334+00	2026-04-22 13:21:18.449334+00	[]
f510a515-f9b5-41d2-ae13-288afe2ae69f	KNG	Kingden Facturacion	Facturacion	scrum	activo	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22 13:23:56.825743+00	2026-04-22 13:23:56.825743+00	[]
37beb68d-3baf-4a1b-8d51-3e1b6539140f	KNGS	Kingden Sitio de Proveedores	Sitio de proveedores	scrum	activo	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22 13:26:07.436547+00	2026-04-22 13:26:07.436547+00	[]
027fa9f0-f03f-4c18-970c-9374bace6e5b	RYS	RIFASYIN-YANG Sitio	Sitio web	scrum	activo	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22 13:27:27.609816+00	2026-04-22 13:27:27.609816+00	[]
bab1aa48-dc68-4165-8847-30e240091641	RCT	RecTrack Sitio web	Sitio web	scrum	activo	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22 13:28:24.186495+00	2026-04-22 13:28:24.186495+00	[]
a092bc84-7294-4ce0-9261-d410e04c0359	RCTT	RecTrack CRM	CRM	scrum	activo	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22 13:29:48.772154+00	2026-04-22 13:29:48.772154+00	[]
fedd8755-1935-4c0a-aefb-41dcf3ece4ef	RXF	Rxflow	Plataforma de gestion de proyectos	scrum	activo	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22 13:40:33.959657+00	2026-04-22 13:40:33.959657+00	[]
d24e523f-8e3e-46e1-be30-f8271ceb610c	MVP	MVP Aplicacion de panaderia	Aplicacion de panderia	scrum	activo	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22 13:43:23.44298+00	2026-04-22 13:43:23.44298+00	[]
f004e31b-991f-402e-96ff-a97f800653af	PASW	Panel de administración de sitios web	Panel de administración de sitios web	scrum	activo	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22 16:09:23.672509+00	2026-04-22 16:09:23.672509+00	[]
f90bd0b9-1c42-4d10-8533-a9a7359ff8f7	RXB	Rxbread	MVP para crear un tabulador	scrum	activo	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22 21:29:51.33399+00	2026-04-22 21:29:51.33399+00	[]
\.


--
-- Data for Name: task_labels; Type: TABLE DATA; Schema: public; Owner: rxflow
--

COPY public.task_labels (task_id, label_id) FROM stdin;
\.


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: rxflow
--

COPY public.tasks (id, sequential_id, project_id, epic_id, cycle_id, parent_task_id, title, description, status, priority, assignee_id, created_by, due_date, completed_at, blocked_reason, "position", created_at, updated_at) FROM stdin;
aa12f6d1-9ead-45bf-964f-e515ad8a22a0	23	027fa9f0-f03f-4c18-970c-9374bace6e5b	9dc22c5e-c35a-4a44-a761-fd3ac0a0b1df	5be5bf35-bf12-4979-bcf4-67f36e8ae74c	\N	Diseño de la sección de "Boletos Vendidos" cumpliendo con los estándares legales de exposición de datos mínimos.	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:00:01.387157+00	2026-04-22 16:00:47.509213+00
95d6f892-272d-4772-b046-11ae106b031e	3	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	32659c70-ccc3-4f0d-b444-759e14237e01	01375b73-d0af-4d2c-aa46-f35322c9cb3a	\N	Menu de epicas poder  eliminar, editar cada epica	\N	en_revision	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 13:49:41.890508+00	2026-04-22 17:42:23.351947+00
554750c0-6ba6-499d-993e-2fd1c2d7fffe	5	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	32659c70-ccc3-4f0d-b444-759e14237e01	\N	\N	Al momento de crear, editar areas se tiene que actualizar las vistas[board,epica,backlog]	\N	en_revision	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 14:04:01.571336+00	2026-04-22 14:51:19.152253+00
0346c89d-ca4b-44e0-904f-f88f7130cf4d	1	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	32659c70-ccc3-4f0d-b444-759e14237e01	\N	\N	Corregir logica de identifcador	\N	backlog	baja	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 13:45:05.916397+00	2026-04-22 14:19:22.075853+00
5ce47d36-19a0-40cd-9dc3-7f342f3e8593	4	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	32659c70-ccc3-4f0d-b444-759e14237e01	\N	\N	Al momento de cerrar un cycles agregar logica para que se cierre la ventana	\N	backlog	baja	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 14:00:29.274872+00	2026-04-22 14:19:24.60802+00
d4af2f33-4b7d-4419-9b2b-c5f42b3024a6	7	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	63321493-29ca-487f-9ee7-55ac71060545	\N	\N	Crear tareas para RecK Track [Sitio Web]	\N	backlog	media	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-22	\N	\N	0	2026-04-22 14:21:47.537543+00	2026-04-22 14:21:47.537543+00
0c2fc291-7a14-4376-b254-c952d3b780d9	6	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	32659c70-ccc3-4f0d-b444-759e14237e01	\N	\N	Crear logica de Mis tareas	\N	en_revision	alta	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-22	\N	\N	0	2026-04-22 14:20:51.206385+00	2026-04-22 14:28:41.361405+00
a1ceb92b-7d63-469a-946b-5d2c00998739	8	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	32659c70-ccc3-4f0d-b444-759e14237e01	\N	\N	Mejorar vista y funciones [Vista de tarea individual]	\N	en_progreso	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-22	\N	\N	0	2026-04-22 14:35:02.658937+00	2026-04-22 14:51:08.062052+00
05fb9ccf-20ef-40f2-ab07-bac3f26c4770	2	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	63321493-29ca-487f-9ee7-55ac71060545	\N	\N	Crear tareas para Rxflow	\N	en_revision	alta	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-22	\N	\N	0	2026-04-22 13:46:28.442894+00	2026-04-22 14:52:43.609111+00
942cb1dc-029b-4964-b97e-07eb9ecb141e	2	027fa9f0-f03f-4c18-970c-9374bace6e5b	8b63a83a-965c-4f06-a057-fd7bce03639c	\N	6c1a4842-e874-4bcb-a6d7-78ea99cc92fe	Conexión técnica del sitio con la API de Google Cloud Console.	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:19:07.659999+00	2026-04-22 15:19:07.659999+00
21057123-2b83-479f-9fe2-1922ea2a3c90	3	027fa9f0-f03f-4c18-970c-9374bace6e5b	8b63a83a-965c-4f06-a057-fd7bce03639c	\N	6c1a4842-e874-4bcb-a6d7-78ea99cc92fe	Implementación de lógica de lectura/escritura para actualización bidireccional de datos.	\N	backlog	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:19:53.997261+00	2026-04-22 15:19:53.997261+00
d51902b5-dd55-42a0-aa8d-302dfd494fb9	4	027fa9f0-f03f-4c18-970c-9374bace6e5b	8b63a83a-965c-4f06-a057-fd7bce03639c	\N	6c1a4842-e874-4bcb-a6d7-78ea99cc92fe	Pruebas de estrés y validación de flujo de datos entre el sitio y la hoja de cálculo.	\N	backlog	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:20:31.327131+00	2026-04-22 15:20:31.327131+00
71219edf-b294-40b5-9a9d-aef242f0d311	10	027fa9f0-f03f-4c18-970c-9374bace6e5b	8b63a83a-965c-4f06-a057-fd7bce03639c	95ecd6c4-c407-47eb-bddc-7902bcc19012	\N	Gestión de accesos a Meta Business Suite y configuración de método de pago para consumo de mensajes.	\N	bloqueado	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:42:27.2361+00	2026-04-22 15:44:13.985878+00
53b3b2c3-76b9-45f1-be9d-c59237409a8a	5	027fa9f0-f03f-4c18-970c-9374bace6e5b	8b63a83a-965c-4f06-a057-fd7bce03639c	2214bbdc-0d38-4789-9fac-6e218824478c	\N	Implementación de lógica de lectura/escritura para actualización bidireccional de datos.	\N	backlog	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:21:11.672474+00	2026-04-22 15:31:06.09312+00
56ac4ab3-6acf-4abc-8712-7efeba22a56e	6	027fa9f0-f03f-4c18-970c-9374bace6e5b	8b63a83a-965c-4f06-a057-fd7bce03639c	2214bbdc-0d38-4789-9fac-6e218824478c	\N	Pruebas de estrés y validación de flujo de datos entre el sitio y la hoja de cálculo.	\N	backlog	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:33:26.224229+00	2026-04-22 15:33:36.344492+00
083365e5-d8cf-4d29-8467-15bd8fd63a92	7	027fa9f0-f03f-4c18-970c-9374bace6e5b	8b63a83a-965c-4f06-a057-fd7bce03639c	28979da5-bd3e-4a36-b586-dfac82c39485	\N	Gestión de registro y alta de cuenta del cliente en la plataforma de pagos.	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:37:50.94013+00	2026-04-22 15:39:24.603616+00
dd2e73d4-fb49-49c7-85fb-fab309a4572e	8	027fa9f0-f03f-4c18-970c-9374bace6e5b	8b63a83a-965c-4f06-a057-fd7bce03639c	28979da5-bd3e-4a36-b586-dfac82c39485	\N	Integración vía API/SDK de la pasarela dentro del flujo de checkout del sitio.	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:38:12.325221+00	2026-04-22 15:39:41.719817+00
2529b415-6573-4916-959e-e9448e68ba7a	9	027fa9f0-f03f-4c18-970c-9374bace6e5b	8b63a83a-965c-4f06-a057-fd7bce03639c	28979da5-bd3e-4a36-b586-dfac82c39485	\N	Ejecución de pruebas en modo sandbox y producción para confirmar transacciones.	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:38:52.860951+00	2026-04-22 15:39:43.642706+00
6c1a4842-e874-4bcb-a6d7-78ea99cc92fe	1	027fa9f0-f03f-4c18-970c-9374bace6e5b	8b63a83a-965c-4f06-a057-fd7bce03639c	2214bbdc-0d38-4789-9fac-6e218824478c	\N	Conexión técnica del sitio con la API de Google Cloud Console.	\N	backlog	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:15:23.221952+00	2026-04-22 15:40:17.280865+00
c321378a-a64c-4d29-9db8-3bd8eb5e0557	11	027fa9f0-f03f-4c18-970c-9374bace6e5b	8b63a83a-965c-4f06-a057-fd7bce03639c	95ecd6c4-c407-47eb-bddc-7902bcc19012	\N	Proceso de verificación de negocio ante Meta (estimado 1-5 días hábiles).	\N	bloqueado	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:43:09.557227+00	2026-04-22 15:47:13.931123+00
fe502370-1edd-4952-b738-49fcc8d13fd2	12	027fa9f0-f03f-4c18-970c-9374bace6e5b	8b63a83a-965c-4f06-a057-fd7bce03639c	95ecd6c4-c407-47eb-bddc-7902bcc19012	\N	Programación del envío automático de mensajes de confirmación tras apartado/venta de boletos.	\N	bloqueado	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:43:23.208442+00	2026-04-22 15:47:15.624537+00
93609532-f511-43cc-9125-331da6b7eb0a	14	027fa9f0-f03f-4c18-970c-9374bace6e5b	dd936700-73c0-49a4-b0ab-c531a0696d44	bf3d64d3-b4fe-41b5-a8ff-c20d1b89bc7f	\N	Desarrollo de algoritmo para asignación aleatoria de números (Quick Pick).	\N	backlog	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:45:55.725471+00	2026-04-22 15:47:38.802993+00
e809428d-7639-4805-89eb-aa44062919ee	13	027fa9f0-f03f-4c18-970c-9374bace6e5b	dd936700-73c0-49a4-b0ab-c531a0696d44	bf3d64d3-b4fe-41b5-a8ff-c20d1b89bc7f	\N	Desarrollo de lógica para selección manual de números desde la interfaz.	\N	backlog	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:45:37.298614+00	2026-04-22 15:47:39.960726+00
05fe4b7a-4072-40f4-8b9d-2f2dbe5afdb3	15	027fa9f0-f03f-4c18-970c-9374bace6e5b	dd936700-73c0-49a4-b0ab-c531a0696d44	665d22bc-65e4-4d44-bfc1-ea14560da771	\N	Interfaz de consulta de estado del boleto y visualización de abonos realizados.	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:48:44.293591+00	2026-04-22 15:49:59.222266+00
09746ccd-54fc-4004-85e8-f4cc70e445bb	16	027fa9f0-f03f-4c18-970c-9374bace6e5b	dd936700-73c0-49a4-b0ab-c531a0696d44	665d22bc-65e4-4d44-bfc1-ea14560da771	\N	Implementación de formulario de carga de archivos para comprobantes de transferencia.	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:49:01.440544+00	2026-04-22 15:50:00.990679+00
3ea91c2a-2ce2-4a46-8264-9fdb3f9844b6	17	027fa9f0-f03f-4c18-970c-9374bace6e5b	dd936700-73c0-49a4-b0ab-c531a0696d44	665d22bc-65e4-4d44-bfc1-ea14560da771	\N	Configuración de avisos legales y tiempos de espera (letrero de verificación manual 24 hrs).	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:49:15.615769+00	2026-04-22 15:50:04.016241+00
1811323d-878b-4af3-8aa2-b92d575781fd	18	027fa9f0-f03f-4c18-970c-9374bace6e5b	dd936700-73c0-49a4-b0ab-c531a0696d44	3057c16c-24fb-42e4-95c7-eed1e6ae0f3f	\N	Filtro de seguridad para visualización pública (mostrar solo número y nombre, ocultar datos sensibles).	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:50:54.836645+00	2026-04-22 15:51:58.522638+00
f284362f-bc41-49db-9831-6c4da7af4d2b	19	027fa9f0-f03f-4c18-970c-9374bace6e5b	dd936700-73c0-49a4-b0ab-c531a0696d44	3057c16c-24fb-42e4-95c7-eed1e6ae0f3f	\N	Sincronización en tiempo real de números disponibles basados en el inventario de Google Sheets.	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:51:10.222718+00	2026-04-22 15:52:00.466324+00
2e42270d-5596-4ef7-9b38-e4dca8500c01	20	027fa9f0-f03f-4c18-970c-9374bace6e5b	dd936700-73c0-49a4-b0ab-c531a0696d44	7fa540ec-8b1b-423e-9266-f0f74bf77ac4	\N	Formulario de registro de información personal obligatorio previo al apartado.	\N	backlog	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:52:42.426121+00	2026-04-22 15:53:57.190042+00
d5cd5893-6bcf-4d39-9f44-131fcec88d8b	21	027fa9f0-f03f-4c18-970c-9374bace6e5b	9dc22c5e-c35a-4a44-a761-fd3ac0a0b1df	70e20724-3924-4d83-b3da-2190c868dd3e	\N	Maquetación de sección de contacto con botones/iconos de Facebook y WhatsApp Channel.	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:58:07.876108+00	2026-04-22 15:59:17.777626+00
58d56a52-e36b-4aca-9ca1-d623f82c12df	22	027fa9f0-f03f-4c18-970c-9374bace6e5b	9dc22c5e-c35a-4a44-a761-fd3ac0a0b1df	70e20724-3924-4d83-b3da-2190c868dd3e	\N	Implementación del botón flotante de contacto directo vía WhatsApp.	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 15:58:25.619627+00	2026-04-22 15:59:19.392655+00
76eab628-2c37-4480-83ce-87540f534c98	24	027fa9f0-f03f-4c18-970c-9374bace6e5b	666ce9bf-453e-4b78-b3c5-78bd2e9b145f	618ff6cb-9f39-4f13-b3d1-60ad1cbc3489	\N	Animación de estados en los números (Disponible, Seleccionado, Vendido).	\N	backlog	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:01:52.207517+00	2026-04-22 16:02:54.482011+00
49caac40-4859-4f0e-b05e-110d24bf4e68	25	027fa9f0-f03f-4c18-970c-9374bace6e5b	666ce9bf-453e-4b78-b3c5-78bd2e9b145f	618ff6cb-9f39-4f13-b3d1-60ad1cbc3489	\N	Transiciones y efectos de carga al momento de procesar la selección aleatoria para mejorar la experiencia de usuario.	\N	backlog	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:02:09.715391+00	2026-04-22 16:02:55.90796+00
00426212-7970-4492-a992-1d4c8bedebe3	9	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	32659c70-ccc3-4f0d-b444-759e14237e01	01375b73-d0af-4d2c-aa46-f35322c9cb3a	\N	Inhabilitar subtareas en Épicas.	\N	backlog	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:04:17.335567+00	2026-04-22 16:04:56.450794+00
79eb18bf-c400-4793-a0f4-b69472063018	1	725a2211-9531-466d-ba0b-1df66ef0e70c	7edb86b7-7239-4712-a80b-1cf35bbd37de	18dde9e5-8613-4476-8997-0dd12ae2964b	\N	Maquetación y estructura del sitio desarrollada desde cero en Shopify.	\N	backlog	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:10:56.979078+00	2026-04-22 16:11:47.697024+00
d289640b-91d8-4e00-a214-87f5dd556c81	2	725a2211-9531-466d-ba0b-1df66ef0e70c	7edb86b7-7239-4712-a80b-1cf35bbd37de	0ea60d15-77b5-4ef6-b701-e3d897bba707	\N	Implementación de sistema de catálogos descargables en formato PDF.	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:12:25.617645+00	2026-04-22 16:13:44.139119+00
b36767be-07c0-41ea-b37f-5cbb410ea14e	3	725a2211-9531-466d-ba0b-1df66ef0e70c	7edb86b7-7239-4712-a80b-1cf35bbd37de	96fdcb74-de66-4ae5-b1f0-79f459192526	\N	Configuración de banner principal con actualización dinámica de imágenes.	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:12:40.477247+00	2026-04-22 16:14:17.624507+00
fcdfdbab-07bf-45c6-9633-2d18cb248a2a	4	725a2211-9531-466d-ba0b-1df66ef0e70c	7edb86b7-7239-4712-a80b-1cf35bbd37de	262de254-d31f-4532-b28f-68f6a98c93f8	\N	Sustitución de cards por imágenes fijas para la exhibición de productos.	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:12:52.987226+00	2026-04-22 16:14:53.186339+00
cdefccba-fe54-42c9-a428-de29a0a7fcf5	5	725a2211-9531-466d-ba0b-1df66ef0e70c	7edb86b7-7239-4712-a80b-1cf35bbd37de	262de254-d31f-4532-b28f-68f6a98c93f8	\N	Organización y estructuración de datos de contacto según propuesta de RecTrack.	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:13:08.427644+00	2026-04-22 16:15:27.628274+00
3e5a2d93-adbe-4906-9975-b60bdad267d4	6	725a2211-9531-466d-ba0b-1df66ef0e70c	d00cd5db-49bd-4ab4-8a31-c047660571f7	f6c4ce13-a96d-4431-94d2-2b5d83e2bdb3	\N	Vinculación activa con el convenio directo del cliente.	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:17:04.519355+00	2026-04-22 16:19:04.432341+00
681adb9e-54c7-433c-8d02-53ea6ff0fafd	8	725a2211-9531-466d-ba0b-1df66ef0e70c	d00cd5db-49bd-4ab4-8a31-c047660571f7	cbe55d82-7c43-4a23-a5c4-845186505bcf	\N	Integración de Mercado Pago como procesador transaccional.	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:17:28.7616+00	2026-04-22 16:20:26.136452+00
0ba3638a-055f-4260-85f4-db1227abcf5a	7	725a2211-9531-466d-ba0b-1df66ef0e70c	d00cd5db-49bd-4ab4-8a31-c047660571f7	\N	\N	Integración de plataforma Envia.com para gestión de envíos.	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:17:16.466297+00	2026-04-22 16:20:34.669778+00
35558b66-b4f5-4a4b-8640-fa8aabc670c8	9	725a2211-9531-466d-ba0b-1df66ef0e70c	d00cd5db-49bd-4ab4-8a31-c047660571f7	cdaf7e2a-abc7-45cd-b262-ec35e66244ce	\N	Integración de OpenPay como pasarela de pago alternativa.	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:17:43.861269+00	2026-04-22 16:23:26.847412+00
de9b2e3e-788e-485f-bb54-67880a1aec03	10	725a2211-9531-466d-ba0b-1df66ef0e70c	d00cd5db-49bd-4ab4-8a31-c047660571f7	c33e4d33-fa76-4bb3-962b-86588f6194d3	\N	No definida por el cliente; fuera del alcance de este folio.	\N	bloqueado	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:18:17.004186+00	2026-04-22 16:24:07.446658+00
09ea37ca-4f6c-408a-ba44-1104394a72af	11	725a2211-9531-466d-ba0b-1df66ef0e70c	2b397aa2-0963-44ec-b095-9385aa21a82f	056ed57b-ec7a-4af4-8d47-080513e70faa	\N	Interfaz alineada a las referencias visuales proporcionadas por Futool.	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:26:06.170386+00	2026-04-22 16:27:10.463107+00
b8753dc0-3e79-4a59-8fb8-03da46c3e71c	12	725a2211-9531-466d-ba0b-1df66ef0e70c	2b397aa2-0963-44ec-b095-9385aa21a82f	10bad6ed-f8a3-466f-9ee7-958b19860a2e	\N	Configuración de padding, botones de WhatsApp y productos destacados.	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:26:20.612801+00	2026-04-22 16:27:56.225544+00
4832ef7f-b72b-4802-802b-01196914a35b	13	725a2211-9531-466d-ba0b-1df66ef0e70c	fe7566e4-5560-4043-a650-8e265b85ec34	43fb6f77-d615-46c2-b24b-7be3cd5da718	\N	Adaptabilidad en breakpoints: Móvil (320px+), Tablet (768px+) y Desktop (1200px+).	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:29:12.172952+00	2026-04-22 16:31:05.255966+00
2c48409d-0368-49cd-9c90-97ff6c0adfcd	14	725a2211-9531-466d-ba0b-1df66ef0e70c	fe7566e4-5560-4043-a650-8e265b85ec34	b8d718f8-1e71-4de8-994c-c28e2559a99c	\N	Implementación de transiciones de carga y animaciones de entrada (fade-in/slide-up).	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:29:56.396627+00	2026-04-22 16:31:53.132336+00
e42c3b7a-b83d-4b09-bee1-d7880bf4d6ac	15	725a2211-9531-466d-ba0b-1df66ef0e70c	fe7566e4-5560-4043-a650-8e265b85ec34	4be47c45-1e37-45f5-8331-d72e01358b4a	\N	Gestión de dominio, redirecciones y certificados SSL/TLS en Shopify.	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:30:11.95554+00	2026-04-22 16:32:31.840844+00
6d24453d-49a7-49f4-ae64-f2b62ca59f17	16	725a2211-9531-466d-ba0b-1df66ef0e70c	43ea57f7-ae68-4f98-93d6-b8e4986dc948	f98df020-059d-4d67-bc86-b3ae2a99a28c	\N	Reducir tamaño de apartados para resaltar la barra de búsqueda e iconos	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:33:45.053989+00	2026-04-22 16:39:05.43321+00
92ac821f-23f1-4a3d-89af-ee3392848ffb	17	725a2211-9531-466d-ba0b-1df66ef0e70c	43ea57f7-ae68-4f98-93d6-b8e4986dc948	2831a07f-27e3-46b3-bd27-13403a879dc0	\N	Evaluar el envío de iconos personalizados con plasta de color para integración final.	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:33:57.234667+00	2026-04-22 16:39:46.580495+00
afbdb4f3-6037-4e51-8f11-a8fa49dbc3d7	18	725a2211-9531-466d-ba0b-1df66ef0e70c	43ea57f7-ae68-4f98-93d6-b8e4986dc948	83ef4979-4e00-4ca6-9702-b751651c3af7	\N	Ajustar el tamaño del logo en la sección de pagos según límites de Shopify.	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:34:12.567776+00	2026-04-22 16:40:30.659817+00
52ae1014-6278-45f9-9d6f-99519d98d948	19	725a2211-9531-466d-ba0b-1df66ef0e70c	43ea57f7-ae68-4f98-93d6-b8e4986dc948	27fc5949-bdf4-4347-8744-8f42f9c709fb	\N	Agregar ruta de navegación (Inicio / Maquinaria / Categoría) en productos.	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:34:35.624088+00	2026-04-22 16:41:13.589906+00
99973238-e312-4010-8579-eea4d9368788	20	725a2211-9531-466d-ba0b-1df66ef0e70c	43ea57f7-ae68-4f98-93d6-b8e4986dc948	4b5571c8-26a5-41a1-bcb7-83f191dfade0	\N	Añadir apartado de "Preguntas y Respuestas" en menú y fichas de producto.	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:34:48.817246+00	2026-04-22 16:42:02.985026+00
82eb4e3e-e26f-4c28-87fc-5c083598fefb	21	725a2211-9531-466d-ba0b-1df66ef0e70c	43ea57f7-ae68-4f98-93d6-b8e4986dc948	8eb08010-5c7a-4abd-8ac9-ea5c005c7fd9	\N	Homologar el tamaño de los botones "Agregar al carrito" y "Comprar ahora"	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:35:00.600061+00	2026-04-22 16:42:36.783762+00
5b00bebb-3602-43a8-a391-8153b0484248	22	725a2211-9531-466d-ba0b-1df66ef0e70c	8508f132-e1f8-4b2a-ac66-14d58453b09b	2a688f53-df8e-46f2-bc3b-8ba63623af9f	\N	Retirar Shop Pay y G Pay; dejar únicamente OpenPay y Mercado Pago.	\N	backlog	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:44:17.637541+00	2026-04-22 16:47:09.861494+00
dc2ee7ba-52e0-4cd6-a821-47d5752dd19d	23	725a2211-9531-466d-ba0b-1df66ef0e70c	8508f132-e1f8-4b2a-ac66-14d58453b09b	29e0fae3-011b-43fd-9060-4f639e436702	\N	Eliminar el apartado de facturación y la leyenda de "Pago exprés".	\N	backlog	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:44:31.500011+00	2026-04-22 16:47:40.258061+00
58812dc3-dec3-4161-b500-17b0819cbf25	24	725a2211-9531-466d-ba0b-1df66ef0e70c	8508f132-e1f8-4b2a-ac66-14d58453b09b	af21299f-55c2-48cc-93ef-b5a14d3a9b26	\N	Ajustar el catálogo para mostrar solo Futool, Palezzi y Kawano	\N	backlog	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:44:44.887228+00	2026-04-22 16:48:28.520327+00
a33d939e-94b5-4533-baf6-23d2b6cfafad	25	725a2211-9531-466d-ba0b-1df66ef0e70c	8508f132-e1f8-4b2a-ac66-14d58453b09b	f743b2db-8d13-4cf8-8297-67cadad4373d	\N	Modificar y validar los números telefónicos correctos en el sitio	\N	backlog	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:45:04.070416+00	2026-04-22 16:49:18.14449+00
29707c0b-8be6-447f-b644-103e6d292c8d	26	725a2211-9531-466d-ba0b-1df66ef0e70c	8508f132-e1f8-4b2a-ac66-14d58453b09b	d98501a2-81ee-4e5f-a6bf-0daa8ab82755	\N	Completar las categorías faltantes en Maquinaria y Refacciones.	\N	backlog	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:45:16.467276+00	2026-04-22 16:49:54.004326+00
2d5d6bdb-069d-4fcf-8017-b329827a4c1a	27	725a2211-9531-466d-ba0b-1df66ef0e70c	8508f132-e1f8-4b2a-ac66-14d58453b09b	b52d554a-f271-4f88-9a30-9b88980d6c9f	\N	Ajustar el degradado a blanco para que se una visualmente a "Recomendados".	\N	backlog	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:45:30.364266+00	2026-04-22 16:50:25.298758+00
9f6b64dc-aa4b-4405-bd8e-c949afd79260	28	725a2211-9531-466d-ba0b-1df66ef0e70c	8508f132-e1f8-4b2a-ac66-14d58453b09b	6a699ad4-89f0-4fbb-865d-9f8daede805a	\N	Corregir errores tipográficos, incluyendo el uso de "v" minúscula en correo	\N	backlog	alta	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22	\N	\N	0	2026-04-22 16:46:16.158209+00	2026-04-22 16:51:03.667611+00
c2d71931-6f3f-4555-a2d5-8768d794fa7c	10	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	32659c70-ccc3-4f0d-b444-759e14237e01	\N	\N	Corregir logica de bandeja de  notificaciones	\N	completada	media	a4724453-124c-45a3-a8c5-db01560300cc	a4724453-124c-45a3-a8c5-db01560300cc	2026-04-15	\N	\N	0	2026-04-22 17:45:59.722471+00	2026-04-22 17:45:59.722471+00
ac92724b-3ed1-412e-8472-e6f7684a5595	11	fedd8755-1935-4c0a-aefb-41dcf3ece4ef	32659c70-ccc3-4f0d-b444-759e14237e01	\N	\N	Corregir bug en epicas de panel de administracion	Cuando agregas la epica como tarea padre es cuando deparece la epica	backlog	urgente	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 13:36:22.790783+00	2026-04-23 13:43:04.552118+00
5dab8cc3-dff7-4e3d-a414-8dd294d405b6	1	f004e31b-991f-402e-96ff-a97f800653af	c2dd09aa-3c4c-43a2-ad30-76cfbb1186f1	\N	\N	Pantalla de login con campos de usuario y contraseña	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 13:44:39.533834+00	2026-04-23 13:44:39.533834+00
6e8d2f5b-b585-4dfb-94bd-bbd50ae2681a	2	f004e31b-991f-402e-96ff-a97f800653af	c2dd09aa-3c4c-43a2-ad30-76cfbb1186f1	\N	\N	Envío de credenciales al backend y manejo de respuesta	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 13:45:14.407922+00	2026-04-23 13:45:14.407922+00
d55367ed-5da2-4be8-a9c8-92ee7d00ed5b	3	f004e31b-991f-402e-96ff-a97f800653af	c2dd09aa-3c4c-43a2-ad30-76cfbb1186f1	\N	\N	Almacenamiento del token de sesión (JWT) en el cliente	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 13:45:33.854747+00	2026-04-23 13:45:33.854747+00
aa54b342-ed94-44b9-a5d5-2412a713fa02	4	f004e31b-991f-402e-96ff-a97f800653af	c2dd09aa-3c4c-43a2-ad30-76cfbb1186f1	\N	\N	Redirección automática al panel tras login exitoso	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 13:45:50.239094+00	2026-04-23 13:45:50.239094+00
e3372b57-c4af-41ad-bd97-293b28cc4e53	5	f004e31b-991f-402e-96ff-a97f800653af	c2dd09aa-3c4c-43a2-ad30-76cfbb1186f1	\N	\N	Cierre de sesión / logout desde el cliente	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 13:46:08.686532+00	2026-04-23 13:46:08.686532+00
13ace62c-205b-4ea7-851f-cf1eaee6b23a	6	f004e31b-991f-402e-96ff-a97f800653af	c2dd09aa-3c4c-43a2-ad30-76cfbb1186f1	\N	\N	Manejo de errores visuales: credenciales incorrectas, sesión expirada	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 13:46:20.183631+00	2026-04-23 13:46:20.183631+00
475c5b8b-e9fd-4b46-9eed-ecd57af756d9	7	f004e31b-991f-402e-96ff-a97f800653af	5de321cd-5db2-4e2d-8189-7db41ae73318	\N	\N	Vista principal con lista de sitios/marcas consumida desde la API	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 13:47:33.31229+00	2026-04-23 13:47:33.31229+00
1fc512df-744b-4afb-b30d-2875affd9199	8	f004e31b-991f-402e-96ff-a97f800653af	5de321cd-5db2-4e2d-8189-7db41ae73318	\N	\N	Detalle de cada sitio: nombre, URL, descripción, estado (activo/inactivo)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 13:47:45.79834+00	2026-04-23 13:47:45.79834+00
b9978f13-1995-4c38-9340-4fba04759e24	9	f004e31b-991f-402e-96ff-a97f800653af	5de321cd-5db2-4e2d-8189-7db41ae73318	\N	\N	Formulario para crear y editar sitios	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 13:48:04.148486+00	2026-04-23 13:48:04.148486+00
f759ff69-cc8d-469d-9ebb-29c82110a7df	10	f004e31b-991f-402e-96ff-a97f800653af	5de321cd-5db2-4e2d-8189-7db41ae73318	\N	\N	El panel adapta colores, logo y tipografía de la marca seleccionada	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 13:48:16.950757+00	2026-04-23 13:48:16.950757+00
961f7f65-525f-4efc-a730-f9e89ccf54c1	11	f004e31b-991f-402e-96ff-a97f800653af	7f8ff9cf-61ca-46b5-88df-dd8f5f5e647f	\N	\N	Barra lateral fija con navegación entre secciones del panel	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 13:48:36.9787+00	2026-04-23 13:48:36.9787+00
f9d709fb-31c2-43b5-b602-a9430f3570c5	12	f004e31b-991f-402e-96ff-a97f800653af	7f8ff9cf-61ca-46b5-88df-dd8f5f5e647f	\N	\N	Sección de colores: swatches editables con input de valor hex, guarda vía API	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 13:48:52.147952+00	2026-04-23 13:48:52.147952+00
bcdfb3a1-23af-4d40-aeb9-4f11fe2759a6	13	f004e31b-991f-402e-96ff-a97f800653af	7f8ff9cf-61ca-46b5-88df-dd8f5f5e647f	\N	\N	Sección de logos: drag & drop para subir imagen, previsualización y envío vía API	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 13:49:04.457685+00	2026-04-23 13:49:04.457685+00
3d8c8b6d-fe64-485f-ae5a-9aa2917dd08a	14	f004e31b-991f-402e-96ff-a97f800653af	7f8ff9cf-61ca-46b5-88df-dd8f5f5e647f	\N	\N	Sección de contenido: campos de texto editables por apartado del sitio, guarda vía API	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 13:49:17.831085+00	2026-04-23 13:49:17.831085+00
a7d29c91-559c-443e-a59c-296680ee768d	15	f004e31b-991f-402e-96ff-a97f800653af	7f8ff9cf-61ca-46b5-88df-dd8f5f5e647f	\N	\N	Indicador visual de sección activa en la barra lateral	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 13:49:28.645552+00	2026-04-23 13:49:28.645552+00
f6b80abe-a004-462d-8f03-36d989aefd65	16	f004e31b-991f-402e-96ff-a97f800653af	7f8ff9cf-61ca-46b5-88df-dd8f5f5e647f	\N	\N	La barra lateral adapta su estilo visual a la paleta de la marca activa	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 13:49:46.757634+00	2026-04-23 13:49:46.757634+00
6c8622e2-7e35-4a5e-a943-b342dc9cc5c0	17	f004e31b-991f-402e-96ff-a97f800653af	68fb1fbe-315d-4156-8f08-b56bae5bc63c	\N	\N	Módulo genérico de edición de textos por sección (hero, about, contacto, etc.)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 13:50:09.910459+00	2026-04-23 13:50:09.910459+00
d022247b-de84-4211-a591-0881662e86e2	18	f004e31b-991f-402e-96ff-a97f800653af	68fb1fbe-315d-4156-8f08-b56bae5bc63c	\N	\N	Eliminar o limpiar contenido específico de una sección vía API	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 13:50:21.15177+00	2026-04-23 13:50:21.15177+00
d59ea2b5-411e-4ce4-b541-e9451c220774	19	f004e31b-991f-402e-96ff-a97f800653af	68fb1fbe-315d-4156-8f08-b56bae5bc63c	\N	\N	Previsualización de cambios antes de publicar	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 13:50:35.581846+00	2026-04-23 13:50:35.581846+00
49b49682-d7e4-4cba-82c2-f345a9496a68	20	f004e31b-991f-402e-96ff-a97f800653af	68fb1fbe-315d-4156-8f08-b56bae5bc63c	\N	\N	Historial básico de cambios por sección (consumido desde API)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 13:50:58.214408+00	2026-04-23 13:50:58.214408+00
189812f4-4621-4f95-abc3-8911a6f3f136	21	f004e31b-991f-402e-96ff-a97f800653af	8e2b630a-3562-479a-9fbd-bd93cf45a810	\N	\N	Historial básico de cambios por sección (consumido desde API)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 13:51:17.047969+00	2026-04-23 13:51:17.047969+00
9c6af29c-b337-4a59-877f-c76c3cad1471	22	f004e31b-991f-402e-96ff-a97f800653af	8e2b630a-3562-479a-9fbd-bd93cf45a810	\N	\N	Tema base neutro (grises, blanco) cuando no hay marca seleccionada	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 13:51:34.364819+00	2026-04-23 13:51:34.364819+00
bb58c609-a57a-4b4c-81c2-a6c6483dcc89	23	f004e31b-991f-402e-96ff-a97f800653af	69c1504d-227f-4927-aa2a-11384ad951f3	\N	\N	Endpoint de login: validar usuario y contraseña, retornar JWT	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 13:52:22.269927+00	2026-04-23 13:52:22.269927+00
e3eb50e2-c183-436b-bd34-742ab2c8579a	24	f004e31b-991f-402e-96ff-a97f800653af	69c1504d-227f-4927-aa2a-11384ad951f3	\N	\N	Middleware de autenticación para proteger todas las rutas del panel	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 13:52:41.321828+00	2026-04-23 13:52:41.321828+00
dfc87a97-02a2-43aa-8a84-290a9676f8f7	25	f004e31b-991f-402e-96ff-a97f800653af	69c1504d-227f-4927-aa2a-11384ad951f3	\N	\N	Manejo de expiración de token y renovación de sesión	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 13:52:55.83313+00	2026-04-23 13:52:55.83313+00
b0e9200c-7870-481e-8d93-0a3d68fd922d	26	f004e31b-991f-402e-96ff-a97f800653af	69c1504d-227f-4927-aa2a-11384ad951f3	\N	\N	Endpoint de logout / invalidación de token	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 13:53:08.094676+00	2026-04-23 13:53:08.094676+00
14e312d4-fd5a-45dc-adc1-3ee7b8371e48	27	f004e31b-991f-402e-96ff-a97f800653af	820c0351-c3a8-4b8c-aab6-63468177f51a	\N	\N	Endpoint para listar todos los sitios registrados	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 13:54:30.367041+00	2026-04-23 13:54:46.813185+00
a823dba9-e83d-4054-9f2c-fe0288b60b42	28	f004e31b-991f-402e-96ff-a97f800653af	820c0351-c3a8-4b8c-aab6-63468177f51a	\N	\N	Endpoint para crear un sitio (nombre, URL base, token de API, descripción)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 13:55:17.380105+00	2026-04-23 13:55:17.380105+00
e47f0ffc-6417-4998-b540-5bd1cae91bbb	29	f004e31b-991f-402e-96ff-a97f800653af	820c0351-c3a8-4b8c-aab6-63468177f51a	\N	\N	Endpoint para editar los datos de un sitio	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 13:55:30.827623+00	2026-04-23 13:55:30.827623+00
06b524cc-f4ed-4f6a-9e55-0f73fb9b3b32	30	f004e31b-991f-402e-96ff-a97f800653af	820c0351-c3a8-4b8c-aab6-63468177f51a	\N	\N	Endpoint para obtener el detalle de un sitio específico	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 13:55:45.34507+00	2026-04-23 13:55:45.34507+00
568616b9-b713-42db-a9e9-cba9a0c84696	31	f004e31b-991f-402e-96ff-a97f800653af	4650366c-d1e1-411d-abdd-94829d734a19	\N	\N	Módulo genérico de conexión: recibe URL base y token del sitio destino	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 13:56:41.683792+00	2026-04-23 13:56:41.683792+00
8ffa32b9-7801-4490-a4b2-4f07ab928a4e	32	f004e31b-991f-402e-96ff-a97f800653af	4650366c-d1e1-411d-abdd-94829d734a19	\N	\N	Peticiones GET al sitio destino para obtener contenido actual (textos, colores, logos)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 13:56:53.911388+00	2026-04-23 13:56:53.911388+00
4fa2b428-c1e1-43e0-9577-26dc3f3d793a	33	f004e31b-991f-402e-96ff-a97f800653af	4650366c-d1e1-411d-abdd-94829d734a19	\N	\N	Peticiones PUT/PATCH al sitio destino para actualizar contenido desde el panel	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 13:57:07.042418+00	2026-04-23 13:57:07.042418+00
8c99a948-ece7-4ecb-b0df-ccd8c0ad92f9	34	f004e31b-991f-402e-96ff-a97f800653af	4650366c-d1e1-411d-abdd-94829d734a19	\N	\N	Peticiones DELETE al sitio destino para eliminar contenido específico de una sección	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 13:57:19.922033+00	2026-04-23 13:57:19.922033+00
826157f8-500e-4dad-915f-c602753f3bd5	35	f004e31b-991f-402e-96ff-a97f800653af	4650366c-d1e1-411d-abdd-94829d734a19	\N	\N	Manejo de errores de conexión, timeouts y respuestas inesperadas	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 13:57:41.873631+00	2026-04-23 13:57:41.873631+00
decc8129-47eb-49e4-95ac-612816a487ab	36	f004e31b-991f-402e-96ff-a97f800653af	3592eb43-8a20-44a0-a74e-bdb434937e42	\N	\N	Endpoint para recibir y subir logos/imágenes a servicio de almacenamiento (S3, Cloudinary, etc.)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 13:58:50.350952+00	2026-04-23 13:58:50.350952+00
992ef1a1-038b-4e9d-8295-ce5faa063313	37	f004e31b-991f-402e-96ff-a97f800653af	3592eb43-8a20-44a0-a74e-bdb434937e42	\N	\N	Retornar URL pública del archivo subido para enviarlo al sitio destino vía API	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 13:59:05.647+00	2026-04-23 13:59:05.647+00
7fe72ec3-60d5-49cf-8d9b-5742003a90ff	38	f004e31b-991f-402e-96ff-a97f800653af	a553a1f5-1efc-4fe0-b495-f33f23e00642	\N	\N	Registrar cada cambio realizado por sección y sitio (fecha, usuario, tipo de cambio)	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 13:59:44.099943+00	2026-04-23 13:59:44.099943+00
b47d3a74-2c7f-4f67-bc89-f27d5484d1e9	39	f004e31b-991f-402e-96ff-a97f800653af	a553a1f5-1efc-4fe0-b495-f33f23e00642	\N	\N	Endpoint para consultar historial de cambios por sitio	\N	backlog	media	a4724453-124c-45a3-a8c5-db01560300cc	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-23	\N	\N	0	2026-04-23 14:00:08.532028+00	2026-04-23 14:00:08.532028+00
\.


--
-- Data for Name: user_notification_prefs; Type: TABLE DATA; Schema: public; Owner: rxflow
--

COPY public.user_notification_prefs (user_id, mentions, assignments, comments, updates, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: rxflow
--

COPY public.users (id, name, email, password_hash, role, initials, avatar_url, presence_status, last_seen_at, is_active, created_at, updated_at, avatar_color) FROM stdin;
a4724453-124c-45a3-a8c5-db01560300cc	Daniel Galicia	rxcode@gmail.com	$2b$10$9rX0Yq6y7M8v0XahoM5g9ew0uaSICShfpcO2dVsyxIPCfNBp4mHVS	member	DG	\N	offline	\N	t	2026-04-21 23:25:33.309135+00	2026-04-22 12:51:25.275978+00	#0891b2
ec88a68e-5a20-402b-bd82-4dd854ce7fbf	Ana Núñez	ana@rxflow.io	$2b$10$uyj02rKmNNht/BsnK4CSE.g0uF7y1wStQnYD/8xHxjeeQYQMxQNkq	admin	AN	\N	online	\N	f	2026-04-21 23:19:08.4382+00	2026-04-22 13:13:29.055559+00	\N
fac2efa8-e7aa-4dbf-8c93-bec6df3fe54e	Juan Ríos	juan@rxflow.io	$2b$10$uyj02rKmNNht/BsnK4CSE.g0uF7y1wStQnYD/8xHxjeeQYQMxQNkq	member	JR	\N	offline	\N	f	2026-04-21 23:19:08.4382+00	2026-04-22 13:13:35.539563+00	\N
dc67abc3-0181-4e89-ac27-4618553832d0	Luis Mora	luis@rxflow.io	$2b$10$uyj02rKmNNht/BsnK4CSE.g0uF7y1wStQnYD/8xHxjeeQYQMxQNkq	member	LM	\N	online	\N	f	2026-04-21 23:19:08.4382+00	2026-04-22 13:13:41.650811+00	\N
1b827dbe-7d8e-41c4-bde2-3ab6c8e8cb0b	Sara Castro	sara@rxflow.io	$2b$10$uyj02rKmNNht/BsnK4CSE.g0uF7y1wStQnYD/8xHxjeeQYQMxQNkq	member	SC	\N	away	\N	f	2026-04-21 23:19:08.4382+00	2026-04-22 13:13:48.340162+00	\N
9cc69f1b-31d7-4c7b-b913-0070158ed2e3	TES	test@test.com	$2b$10$8RcfDc8D6e04c/JDsaUSaOv2o13HHrf1qnSL8qCdfa38i87OFJHZW	member	T	\N	offline	\N	t	2026-04-22 17:42:59.694446+00	2026-04-22 17:43:53.639298+00	#7c3aed
d9e0a494-bc42-41ed-984d-967a44bf634e	fER	rectrack@gmail.com	$2b$10$aveP0nVbr3kE9YCNblZwA.8co/rUKEiaU3btsCZoLx00QuO5Y/KnK	member	F	\N	offline	\N	t	2026-04-22 18:14:35.670856+00	2026-04-22 18:14:35.670856+00	\N
880fce53-5d27-4c4d-9d1e-e8c1a74d6887	Michelle Ramirez	rxcode.pm@gmail.com	$2b$10$I.rZIZS6FutS/u0/jf2ofug7LXnoYEB0C5p.LPDvLLMk7pP5ujjaS	member	MR	\N	offline	\N	t	2026-04-22 12:52:40.369111+00	2026-04-22 21:22:51.465607+00	#111111
\.


--
-- Data for Name: wiki_pages; Type: TABLE DATA; Schema: public; Owner: rxflow
--

COPY public.wiki_pages (id, project_id, slug, title, content, author_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: workspace_members; Type: TABLE DATA; Schema: public; Owner: rxflow
--

COPY public.workspace_members (workspace_id, user_id, added_at) FROM stdin;
\.


--
-- Data for Name: workspace_projects; Type: TABLE DATA; Schema: public; Owner: rxflow
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
4e703992-df0b-40fc-ac26-20bbce34c66e	f004e31b-991f-402e-96ff-a97f800653af	2026-04-22 16:09:23.865011+00
4e703992-df0b-40fc-ac26-20bbce34c66e	f90bd0b9-1c42-4d10-8533-a9a7359ff8f7	2026-04-22 21:29:51.563168+00
\.


--
-- Data for Name: workspaces; Type: TABLE DATA; Schema: public; Owner: rxflow
--

COPY public.workspaces (id, name, description, color, icon, created_by, created_at, updated_at) FROM stdin;
f9d6edaf-e399-4d68-8fc9-ba40ec783d18	RecTrack	Proyectos de cliente con convenio	#ef4444	layers	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22 13:37:33.086965+00	2026-04-22 13:37:33.086965+00
4e703992-df0b-40fc-ac26-20bbce34c66e	Rxcode	Proyectos internos	#3b82f6	code	880fce53-5d27-4c4d-9d1e-e8c1a74d6887	2026-04-22 13:38:11.940298+00	2026-04-22 13:38:11.940298+00
\.


--
-- Name: activity_log activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: cycles cycles_pkey; Type: CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.cycles
    ADD CONSTRAINT cycles_pkey PRIMARY KEY (id);


--
-- Name: cycles cycles_project_id_number_key; Type: CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.cycles
    ADD CONSTRAINT cycles_project_id_number_key UNIQUE (project_id, number);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: epics epics_pkey; Type: CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.epics
    ADD CONSTRAINT epics_pkey PRIMARY KEY (id);


--
-- Name: integrations integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.integrations
    ADD CONSTRAINT integrations_pkey PRIMARY KEY (id);


--
-- Name: integrations integrations_provider_key; Type: CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.integrations
    ADD CONSTRAINT integrations_provider_key UNIQUE (provider);


--
-- Name: labels labels_pkey; Type: CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.labels
    ADD CONSTRAINT labels_pkey PRIMARY KEY (id);


--
-- Name: labels labels_project_id_name_key; Type: CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.labels
    ADD CONSTRAINT labels_project_id_name_key UNIQUE (project_id, name);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: project_members project_members_pkey; Type: CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_pkey PRIMARY KEY (project_id, user_id);


--
-- Name: project_task_sequences project_task_sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.project_task_sequences
    ADD CONSTRAINT project_task_sequences_pkey PRIMARY KEY (project_id);


--
-- Name: projects projects_code_key; Type: CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_code_key UNIQUE (code);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: task_labels task_labels_pkey; Type: CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.task_labels
    ADD CONSTRAINT task_labels_pkey PRIMARY KEY (task_id, label_id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_project_id_sequential_id_key; Type: CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_project_id_sequential_id_key UNIQUE (project_id, sequential_id);


--
-- Name: user_notification_prefs user_notification_prefs_pkey; Type: CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.user_notification_prefs
    ADD CONSTRAINT user_notification_prefs_pkey PRIMARY KEY (user_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: wiki_pages wiki_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.wiki_pages
    ADD CONSTRAINT wiki_pages_pkey PRIMARY KEY (id);


--
-- Name: wiki_pages wiki_pages_project_id_slug_key; Type: CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.wiki_pages
    ADD CONSTRAINT wiki_pages_project_id_slug_key UNIQUE (project_id, slug);


--
-- Name: workspace_members workspace_members_pkey; Type: CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT workspace_members_pkey PRIMARY KEY (workspace_id, user_id);


--
-- Name: workspace_projects workspace_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.workspace_projects
    ADD CONSTRAINT workspace_projects_pkey PRIMARY KEY (workspace_id, project_id);


--
-- Name: workspaces workspaces_pkey; Type: CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_pkey PRIMARY KEY (id);


--
-- Name: idx_activity_created; Type: INDEX; Schema: public; Owner: rxflow
--

CREATE INDEX idx_activity_created ON public.activity_log USING btree (created_at DESC);


--
-- Name: idx_activity_project; Type: INDEX; Schema: public; Owner: rxflow
--

CREATE INDEX idx_activity_project ON public.activity_log USING btree (project_id) WHERE (project_id IS NOT NULL);


--
-- Name: idx_activity_task; Type: INDEX; Schema: public; Owner: rxflow
--

CREATE INDEX idx_activity_task ON public.activity_log USING btree (task_id) WHERE (task_id IS NOT NULL);


--
-- Name: idx_activity_user; Type: INDEX; Schema: public; Owner: rxflow
--

CREATE INDEX idx_activity_user ON public.activity_log USING btree (user_id);


--
-- Name: idx_comments_author; Type: INDEX; Schema: public; Owner: rxflow
--

CREATE INDEX idx_comments_author ON public.comments USING btree (author_id);


--
-- Name: idx_comments_task; Type: INDEX; Schema: public; Owner: rxflow
--

CREATE INDEX idx_comments_task ON public.comments USING btree (task_id);


--
-- Name: idx_cycles_project; Type: INDEX; Schema: public; Owner: rxflow
--

CREATE INDEX idx_cycles_project ON public.cycles USING btree (project_id);


--
-- Name: idx_cycles_status; Type: INDEX; Schema: public; Owner: rxflow
--

CREATE INDEX idx_cycles_status ON public.cycles USING btree (status);


--
-- Name: idx_documents_project; Type: INDEX; Schema: public; Owner: rxflow
--

CREATE INDEX idx_documents_project ON public.documents USING btree (project_id) WHERE (project_id IS NOT NULL);


--
-- Name: idx_epics_parent; Type: INDEX; Schema: public; Owner: rxflow
--

CREATE INDEX idx_epics_parent ON public.epics USING btree (parent_epic_id);


--
-- Name: idx_epics_project; Type: INDEX; Schema: public; Owner: rxflow
--

CREATE INDEX idx_epics_project ON public.epics USING btree (project_id);


--
-- Name: idx_epics_status; Type: INDEX; Schema: public; Owner: rxflow
--

CREATE INDEX idx_epics_status ON public.epics USING btree (status);


--
-- Name: idx_notifications_created; Type: INDEX; Schema: public; Owner: rxflow
--

CREATE INDEX idx_notifications_created ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_recipient; Type: INDEX; Schema: public; Owner: rxflow
--

CREATE INDEX idx_notifications_recipient ON public.notifications USING btree (recipient_id);


--
-- Name: idx_notifications_unread; Type: INDEX; Schema: public; Owner: rxflow
--

CREATE INDEX idx_notifications_unread ON public.notifications USING btree (recipient_id) WHERE (read = false);


--
-- Name: idx_project_members_user; Type: INDEX; Schema: public; Owner: rxflow
--

CREATE INDEX idx_project_members_user ON public.project_members USING btree (user_id);


--
-- Name: idx_projects_created_by; Type: INDEX; Schema: public; Owner: rxflow
--

CREATE INDEX idx_projects_created_by ON public.projects USING btree (created_by);


--
-- Name: idx_projects_status; Type: INDEX; Schema: public; Owner: rxflow
--

CREATE INDEX idx_projects_status ON public.projects USING btree (status);


--
-- Name: idx_tasks_assignee; Type: INDEX; Schema: public; Owner: rxflow
--

CREATE INDEX idx_tasks_assignee ON public.tasks USING btree (assignee_id);


--
-- Name: idx_tasks_cycle; Type: INDEX; Schema: public; Owner: rxflow
--

CREATE INDEX idx_tasks_cycle ON public.tasks USING btree (cycle_id);


--
-- Name: idx_tasks_due_date; Type: INDEX; Schema: public; Owner: rxflow
--

CREATE INDEX idx_tasks_due_date ON public.tasks USING btree (due_date) WHERE (due_date IS NOT NULL);


--
-- Name: idx_tasks_epic; Type: INDEX; Schema: public; Owner: rxflow
--

CREATE INDEX idx_tasks_epic ON public.tasks USING btree (epic_id);


--
-- Name: idx_tasks_parent; Type: INDEX; Schema: public; Owner: rxflow
--

CREATE INDEX idx_tasks_parent ON public.tasks USING btree (parent_task_id);


--
-- Name: idx_tasks_project; Type: INDEX; Schema: public; Owner: rxflow
--

CREATE INDEX idx_tasks_project ON public.tasks USING btree (project_id);


--
-- Name: idx_tasks_status; Type: INDEX; Schema: public; Owner: rxflow
--

CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: rxflow
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_is_active; Type: INDEX; Schema: public; Owner: rxflow
--

CREATE INDEX idx_users_is_active ON public.users USING btree (is_active);


--
-- Name: idx_wiki_project; Type: INDEX; Schema: public; Owner: rxflow
--

CREATE INDEX idx_wiki_project ON public.wiki_pages USING btree (project_id) WHERE (project_id IS NOT NULL);


--
-- Name: comments trg_comments_updated_at; Type: TRIGGER; Schema: public; Owner: rxflow
--

CREATE TRIGGER trg_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: cycles trg_cycles_updated_at; Type: TRIGGER; Schema: public; Owner: rxflow
--

CREATE TRIGGER trg_cycles_updated_at BEFORE UPDATE ON public.cycles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: documents trg_documents_updated_at; Type: TRIGGER; Schema: public; Owner: rxflow
--

CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: epics trg_epics_updated_at; Type: TRIGGER; Schema: public; Owner: rxflow
--

CREATE TRIGGER trg_epics_updated_at BEFORE UPDATE ON public.epics FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: integrations trg_integrations_updated_at; Type: TRIGGER; Schema: public; Owner: rxflow
--

CREATE TRIGGER trg_integrations_updated_at BEFORE UPDATE ON public.integrations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: projects trg_projects_updated_at; Type: TRIGGER; Schema: public; Owner: rxflow
--

CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: tasks trg_tasks_sequential_id; Type: TRIGGER; Schema: public; Owner: rxflow
--

CREATE TRIGGER trg_tasks_sequential_id BEFORE INSERT ON public.tasks FOR EACH ROW WHEN (((new.sequential_id IS NULL) OR (new.sequential_id = 0))) EXECUTE FUNCTION public.assign_task_sequential_id();


--
-- Name: tasks trg_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: rxflow
--

CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: users trg_users_updated_at; Type: TRIGGER; Schema: public; Owner: rxflow
--

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: wiki_pages trg_wiki_updated_at; Type: TRIGGER; Schema: public; Owner: rxflow
--

CREATE TRIGGER trg_wiki_updated_at BEFORE UPDATE ON public.wiki_pages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: workspaces trg_workspaces_updated_at; Type: TRIGGER; Schema: public; Owner: rxflow
--

CREATE TRIGGER trg_workspaces_updated_at BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: activity_log activity_log_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: activity_log activity_log_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: activity_log activity_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: comments comments_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: comments comments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: cycles cycles_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.cycles
    ADD CONSTRAINT cycles_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: documents documents_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: documents documents_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: epics epics_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.epics
    ADD CONSTRAINT epics_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: epics epics_parent_epic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.epics
    ADD CONSTRAINT epics_parent_epic_id_fkey FOREIGN KEY (parent_epic_id) REFERENCES public.epics(id) ON DELETE SET NULL;


--
-- Name: epics epics_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.epics
    ADD CONSTRAINT epics_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: integrations integrations_connected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.integrations
    ADD CONSTRAINT integrations_connected_by_fkey FOREIGN KEY (connected_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: labels labels_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.labels
    ADD CONSTRAINT labels_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- Name: notifications notifications_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: project_members project_members_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_members project_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: project_task_sequences project_task_sequences_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.project_task_sequences
    ADD CONSTRAINT project_task_sequences_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: projects projects_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: task_labels task_labels_label_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.task_labels
    ADD CONSTRAINT task_labels_label_id_fkey FOREIGN KEY (label_id) REFERENCES public.labels(id) ON DELETE CASCADE;


--
-- Name: task_labels task_labels_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.task_labels
    ADD CONSTRAINT task_labels_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_assignee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: tasks tasks_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_cycle_id_fkey FOREIGN KEY (cycle_id) REFERENCES public.cycles(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_epic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_epic_id_fkey FOREIGN KEY (epic_id) REFERENCES public.epics(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_parent_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_parent_task_id_fkey FOREIGN KEY (parent_task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: user_notification_prefs user_notification_prefs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.user_notification_prefs
    ADD CONSTRAINT user_notification_prefs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: wiki_pages wiki_pages_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.wiki_pages
    ADD CONSTRAINT wiki_pages_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: wiki_pages wiki_pages_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.wiki_pages
    ADD CONSTRAINT wiki_pages_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: workspace_members workspace_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT workspace_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: workspace_members workspace_members_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT workspace_members_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: workspace_projects workspace_projects_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.workspace_projects
    ADD CONSTRAINT workspace_projects_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: workspace_projects workspace_projects_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.workspace_projects
    ADD CONSTRAINT workspace_projects_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: workspaces workspaces_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rxflow
--

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict ClhDytEprVRSuIgIHWjSd2IyP3Desq6bP1dkfaSidSUeX7RXUxnNWaPvZSUkw5O

