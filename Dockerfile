FROM node:24-bookworm-slim
WORKDIR /app
COPY --chown=node:node dist ./dist
COPY --chown=node:node database ./database
RUN mkdir /app/data && chown node:node /app/data
ENV HOST=0.0.0.0 PORT=3000 DATA_DIR=/app/data
USER node
EXPOSE 3000
CMD ["node","dist/server.cjs"]
