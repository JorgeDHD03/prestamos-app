from sqlalchemy import create_engine
from app.models import Base

def init_db():
    print("=" * 50)
    print("  Inicializador de Base de Datos en Producción  ")
    print("=" * 50)
    
    url = input("\nPega aquí tu DATABASE_URL de Supabase:\n> ").strip()
    
    if not url:
        print("❌ URL vacía. Cancelando.")
        return

    # Arreglar la string si viene de la interfaz vieja de Supabase
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
        
    if "?pgbouncer=true" in url:
        url = url.replace("?pgbouncer=true", "")
        
    print("\nConectando a Supabase y creando tablas...")
    
    try:
        engine = create_engine(url)
        Base.metadata.create_all(bind=engine)
        print("✅ ¡Tablas creadas exitosamente de forma segura en la nube!")
        print("✅ Ya puedes ir a tu página web y crear tu primera cuenta usando el botón 'Crear cuenta'.")
    except Exception as e:
        print(f"❌ Ocurrió un error al conectar:\n{e}")

if __name__ == "__main__":
    init_db()
