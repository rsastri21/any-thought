# Features Development for MVP

## Users

### Profiles

- [ ] Allow profile image to be edited

## Friends

### Discovery

- [ ] Search for friends via users repository

## Assets

### Upload

- [ ] Endpoint for creating new asset
  - Returns pre-signed URL and creates asset in processing state
  - Calls private endpoint to update asset status to active when upload completes
- [ ] Private endpoint for updating asset status
  - API Key auth via Secrets Manager
  - Called from EventBridge
- [ ] EventBridge infrastructure for async upload workflow

## Posts

### Post Creation

- WIP

### Post Interaction

- WIP

### Post Discovery

- [ ] Surface posts from friends in chronological order
