import os
import requests
import chromadb

CHROMA_MODE = os.getenv("CHROMA_MODE", "local").lower()
CHROMA_COLLECTION_NAME = os.getenv("CHROMA_COLLECTION_NAME", "library_catalog")
CHROMA_HOST = os.getenv("CHROMA_HOST", "api.trychroma.com")
HUGGINGFACE_API_TOKEN = os.getenv("HUGGINGFACE_API_TOKEN")
HUGGINGFACE_EMBEDDING_MODEL = os.getenv("HUGGINGFACE_EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
HUGGINGFACE_API_URL = f"https://router.huggingface.co/hf-inference/models/{HUGGINGFACE_EMBEDDING_MODEL}"

if CHROMA_MODE == "cloud":
    client = chromadb.CloudClient(
        api_key=os.getenv("CHROMA_API_KEY"),
        tenant=os.getenv("CHROMA_TENANT"),
        database=os.getenv("CHROMA_DATABASE")
    )
else:
    chroma_path = os.getenv("CHROMA_PATH", "./backend/chroma_db")
    os.makedirs(chroma_path, exist_ok=True)
    client = chromadb.PersistentClient(path=chroma_path)

# Create or Get the collection without a local embedding model
collection = client.get_or_create_collection(
    name=CHROMA_COLLECTION_NAME
)


def get_huggingface_embeddings(texts: list[str]) -> list[list[float]]:
    """Compute text embeddings using the Hugging Face inference API."""
    if not HUGGINGFACE_API_TOKEN:
        raise EnvironmentError(
            "Missing HUGGINGFACE_API_TOKEN. Set this environment variable to use Hugging Face embeddings."
        )

    headers = {
        "Authorization": f"Bearer {HUGGINGFACE_API_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {"inputs": texts[0]}

    response = requests.post(HUGGINGFACE_API_URL, headers=headers, json=payload, timeout=60)
    response.raise_for_status()

    data = response.json()
    if isinstance(data, dict) and "error" in data:
        raise RuntimeError(f"Hugging Face embedding error: {data['error']}")

    if isinstance(data, dict) and "embedding" in data:
        data = [data]

    return data


def add_book_to_vector_db(book_id: int, text: str, metadata: dict):
    """Indexes a book's description into the vector space."""
    embeddings = get_huggingface_embeddings([text])
    collection.add(
        ids=[str(book_id)],
        documents=[text],
        metadatas=[metadata],
        embeddings=embeddings
    )


def semantic_search_books(query: str, n_results: int = 5):
    """Returns book IDs that are 'conceptually' close to the query."""
    query_embeddings = get_huggingface_embeddings([query])
    results = collection.query(
        query_embeddings=query_embeddings,
        n_results=n_results
    )
    return results.get("ids", [])
