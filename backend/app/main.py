from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.products import router as products_router
from app.routers.group import router as group_router

app = FastAPI(
    title="Snack Safe API",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발 단계에서만
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products_router, prefix="/api")
app.include_router(group_router)

@app.get("/")
def root():
    return {"message": "Snack Safe API is running"}


@app.get("/ping")
def ping():
    return {"status": "ok"}