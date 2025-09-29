# LMS API Schema (Draft)

_Status: Draft v0.1 — aligned with decision LMS-0001_

```yaml
openapi: 3.1.0
info:
  title: ODSUi LMS API
  version: 0.1.0
  description: >-
    REST endpoints backing the ODSUi LMS. All requests require bearer tokens
    issued by Azure AD. Tenancy is enforced via the `X-Tenant-Id` header and
    mirrored in resource payloads.
servers:
  - url: https://{tenant}.lms.api.odsui.ai
    description: Tenant-scoped gateway (Front Door)
    variables:
      tenant:
        default: acme
security:
  - bearerAuth: []
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  parameters:
    TenantHeader:
      name: X-Tenant-Id
      in: header
      required: true
      description: Logical tenant identifier matching token claims
      schema:
        type: string
    CourseId:
      name: courseId
      in: path
      required: true
      schema:
        type: string
        pattern: "^[a-zA-Z0-9_-]{6,}$"
    LessonId:
      name: lessonId
      in: path
      required: true
      schema:
        type: string
  schemas:
    CourseSummary:
      type: object
      required: [id, title, status, updatedAt]
      properties:
        id:
          type: string
        title:
          type: string
        description:
          type: string
        tags:
          type: array
          items: { type: string }
        status:
          type: string
          enum: [draft, published, archived]
        updatedAt:
          type: string
          format: date-time
    CourseDetail:
      allOf:
        - $ref: '#/components/schemas/CourseSummary'
        - type: object
          required: [modules, publishedVersion]
          properties:
            publishedVersion:
              type: integer
              minimum: 1
            draftVersion:
              type: integer
              minimum: 1
            modules:
              type: array
              items:
                type: object
                required: [id, title, order, lessons]
                properties:
                  id: { type: string }
                  title: { type: string }
                  order: { type: integer }
                  lessons:
                    type: array
                    items:
                      type: object
                      required: [id, type, payload]
                      properties:
                        id: { type: string }
                        type:
                          type: string
                          enum: [video, reading, embed, quiz, lab]
                        payload:
                          type: object
                        estimatedDuration:
                          type: integer
                          description: Minutes
                        owuiWorkflowRef:
                          type: string
                          description: Identifier passed to OWUI adapter
    ProgressRecord:
      type: object
      required: [userId, courseId, lessonId, status, updatedAt]
      properties:
        userId: { type: string }
        courseId: { type: string }
        lessonId: { type: string }
        status:
          type: string
          enum: [not-started, in-progress, completed]
        score:
          type: number
          minimum: 0
          maximum: 1
        aiInteractions:
          type: array
          items:
            type: object
            properties:
              sessionId: { type: string }
              workflowId: { type: string }
              summary: { type: string }
        updatedAt:
          type: string
          format: date-time
paths:
  /courses:
    get:
      summary: List published courses for the authenticated learner
      operationId: listCourses
      parameters:
        - $ref: '#/components/parameters/TenantHeader'
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/CourseSummary'
  /courses/{courseId}:
    get:
      summary: Fetch full course detail
      operationId: getCourse
      parameters:
        - $ref: '#/components/parameters/TenantHeader'
        - $ref: '#/components/parameters/CourseId'
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CourseDetail'
  /courses/{courseId}/progress:
    get:
      summary: Retrieve the authenticated learner's progress for a course
      operationId: getCourseProgress
      parameters:
        - $ref: '#/components/parameters/TenantHeader'
        - $ref: '#/components/parameters/CourseId'
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/ProgressRecord'
    post:
      summary: Upsert lesson progress (used by lesson player)
      operationId: upsertProgress
      parameters:
        - $ref: '#/components/parameters/TenantHeader'
        - $ref: '#/components/parameters/CourseId'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ProgressRecord'
      responses:
        '202':
          description: Accepted
  /courses/{courseId}/lessons/{lessonId}/tutor:
    post:
      summary: Invoke OWUI tutor workflow for a lesson
      operationId: invokeLessonTutor
      parameters:
        - $ref: '#/components/parameters/TenantHeader'
        - $ref: '#/components/parameters/CourseId'
        - $ref: '#/components/parameters/LessonId'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                prompt: { type: string }
      responses:
        '200':
          description: OWUI conversation ID and initial response
          content:
            application/json:
              schema:
                type: object
                properties:
                  sessionId: { type: string }
                  message: { type: string }
```

_Last reviewed: 2025-09-27_
