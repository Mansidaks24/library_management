from .database import SessionLocal, engine
from . import models
from .vector_service import add_book_to_vector_db

# Ensure tables exist
models.Base.metadata.create_all(bind=engine)

def seed_database():
    db = SessionLocal()

    
    books_data = [
    {"title": "The Cosmic Odyssey", "author": "Neil Tyson", "category": "Science", "description": "A thrilling journey through the universe, exploring black holes, supernovas, and the origins of galaxies."},
    {"title": "Culinary Mastery", "author": "Julia Child", "category": "Cooking", "description": "Master the art of French cuisine with step-by-step recipes for baking breads, roasting meats, and crafting sauces."},
    {"title": "Empire of the Caesars", "author": "Mary Beard", "category": "History", "description": "An exhaustive look into ancient Rome, detailing the lives of gladiators, emperors, and the fall of the republic."},
    {"title": "Deep Learning with Python", "author": "Francois Chollet", "category": "Technology", "description": "Learn how to build neural networks, train machine learning models, and implement AI using TensorFlow."},
    {"title": "The Whispering Woods", "author": "Elara Vance", "category": "Fantasy", "description": "A magical tale of elves, ancient curses, and a young hero's quest to save the enchanted forest from darkness."},
    {"title": "Financial Freedom", "author": "Robert Kiyosaki", "category": "Finance", "description": "Strategies for investing, managing personal wealth, escaping the rat race, and building passive income."},
    {"title": "Mindful Meditation", "author": "Thich Nhat Hanh", "category": "Wellness", "description": "Techniques for finding inner peace, reducing anxiety, and living completely in the present moment."},
    {"title": "The Art of War", "author": "Sun Tzu", "category": "Philosophy", "description": "Ancient military tactics and strategies for outsmarting your enemies and securing victory in conflict."},
    {"title": "Gardening 101", "author": "Alan Titchmarsh", "category": "Hobbies", "description": "A beginner's guide to planting vegetables, pruning flowers, and maintaining a healthy backyard greenhouse."},
    {"title": "The Silent Detective", "author": "Agatha Christie", "category": "Mystery", "description": "A classic whodunit thriller involving a locked-room murder, hidden clues, and a brilliant investigator."},

    {"title": "Quantum Realities", "author": "Brian Cox", "category": "Science", "description": "An introduction to quantum physics, particles, and the strange nature of reality at microscopic scales."},
    {"title": "Baking Bliss", "author": "Paul Hollywood", "category": "Cooking", "description": "Delicious baking recipes from breads to pastries, with expert tips for perfect textures and flavors."},
    {"title": "World War Chronicles", "author": "Antony Beevor", "category": "History", "description": "Detailed accounts of major battles, strategies, and human stories from global wars."},
    {"title": "AI Revolution", "author": "Andrew Ng", "category": "Technology", "description": "Explore artificial intelligence, machine learning concepts, and their real-world applications."},
    {"title": "Dragon's Rise", "author": "Luna Grey", "category": "Fantasy", "description": "A young warrior bonds with a dragon to fight an ancient evil threatening the kingdom."},
    {"title": "Invest Smart", "author": "Warren Buffett", "category": "Finance", "description": "Principles of long-term investing, stock market strategies, and wealth building."},
    {"title": "Healthy Living Guide", "author": "Deepak Chopra", "category": "Wellness", "description": "Holistic approaches to physical and mental well-being through lifestyle changes."},
    {"title": "Stoic Wisdom", "author": "Marcus Aurelius", "category": "Philosophy", "description": "Insights into stoic philosophy and how to remain calm and rational in life."},
    {"title": "Photography Basics", "author": "Annie Leibovitz", "category": "Hobbies", "description": "Learn camera settings, composition, and lighting techniques for stunning photos."},
    {"title": "Hidden Truth", "author": "Dan Brown", "category": "Mystery", "description": "A fast-paced thriller involving secret societies, codes, and hidden history."},

    {"title": "Space Exploration", "author": "Carl Sagan", "category": "Science", "description": "The story of humanity’s quest to explore space and understand the cosmos."},
    {"title": "Vegan Kitchen", "author": "Jamie Oliver", "category": "Cooking", "description": "Creative plant-based recipes that are both healthy and delicious."},
    {"title": "Medieval Kingdoms", "author": "Dan Jones", "category": "History", "description": "Life, politics, and wars during the medieval era across Europe."},
    {"title": "Python Programming", "author": "Guido van Rossum", "category": "Technology", "description": "A comprehensive guide to Python programming for beginners and professionals."},
    {"title": "Shadow Realm", "author": "Aria Night", "category": "Fantasy", "description": "A hidden world emerges where magic and danger coexist."},
    {"title": "Money Mindset", "author": "T. Harv Eker", "category": "Finance", "description": "Understand how mindset affects wealth and financial success."},
    {"title": "Yoga for Life", "author": "B.K.S. Iyengar", "category": "Wellness", "description": "Yoga practices for flexibility, strength, and mental clarity."},
    {"title": "Existential Thoughts", "author": "Jean-Paul Sartre", "category": "Philosophy", "description": "Exploring freedom, existence, and human responsibility."},
    {"title": "DIY Crafts", "author": "Martha Stewart", "category": "Hobbies", "description": "Creative handmade projects for home decoration and gifts."},
    {"title": "Murder at Midnight", "author": "Arthur Conan Doyle", "category": "Mystery", "description": "A suspenseful investigation filled with twists and deductions."},

    {"title": "Astrophysics Simplified", "author": "Stephen Hawking", "category": "Science", "description": "Understanding black holes, time, and the universe made simple."},
    {"title": "Street Food Secrets", "author": "Anthony Bourdain", "category": "Cooking", "description": "Explore flavors and recipes inspired by global street food."},
    {"title": "Ancient Civilizations", "author": "Will Durant", "category": "History", "description": "The rise and fall of ancient empires and their cultures."},
    {"title": "Cyber Security 101", "author": "Kevin Mitnick", "category": "Technology", "description": "Learn how to protect systems and data from cyber threats."},
    {"title": "The Crystal Kingdom", "author": "Elyra Moon", "category": "Fantasy", "description": "A kingdom powered by crystals faces a looming threat."},
    {"title": "Passive Income Guide", "author": "Timothy Ferriss", "category": "Finance", "description": "Ways to earn income with minimal ongoing effort."},
    {"title": "Mental Strength", "author": "Amy Morin", "category": "Wellness", "description": "Build resilience and emotional strength in everyday life."},
    {"title": "Ethics Explained", "author": "Peter Singer", "category": "Philosophy", "description": "Understanding morality, ethics, and decision-making."},
    {"title": "Travel Photography", "author": "Chris Burkard", "category": "Hobbies", "description": "Capture stunning travel moments with professional techniques."},
    {"title": "The Final Clue", "author": "Gillian Flynn", "category": "Mystery", "description": "A gripping mystery where every clue leads to more questions."},

    {"title": "Climate Change Reality", "author": "David Attenborough", "category": "Science", "description": "Understanding global warming and its impact on Earth."},
    {"title": "Quick Meals", "author": "Rachael Ray", "category": "Cooking", "description": "Fast and easy recipes for busy lifestyles."},
    {"title": "Modern History", "author": "Eric Hobsbawm", "category": "History", "description": "Key global events shaping the modern world."},
    {"title": "Web Development", "author": "Brendan Eich", "category": "Technology", "description": "Learn HTML, CSS, and JavaScript to build websites."},
    {"title": "The Dark Prophecy", "author": "Nora Black", "category": "Fantasy", "description": "A prophecy foretells the fall of kingdoms and rise of darkness."},
    {"title": "Wealth Building", "author": "Dave Ramsey", "category": "Finance", "description": "Step-by-step guide to saving, investing, and financial stability."},
    {"title": "Stress Relief", "author": "Jon Kabat-Zinn", "category": "Wellness", "description": "Mindfulness techniques to reduce stress and anxiety."},
    {"title": "Logic and Reasoning", "author": "Bertrand Russell", "category": "Philosophy", "description": "Fundamentals of logical thinking and reasoning."},
    {"title": "Woodworking Basics", "author": "Nick Offerman", "category": "Hobbies", "description": "Beginner projects and tools for woodworking."},
    {"title": "Case Closed", "author": "Tana French", "category": "Mystery", "description": "A detective unravels a complex case with unexpected twists."}
]

    # Create Branches first
    branches_data = [
        {"location": "North Delhi"},
        {"location": "South Delhi"},
    ]

    branches = []
    for branch_data in branches_data:
        existing_branch = db.query(models.Branch).filter(
            models.Branch.location == branch_data["location"]
        ).first()
        if not existing_branch:
            new_branch = models.Branch(location=branch_data["location"])
            db.add(new_branch)
            db.commit()
            db.refresh(new_branch)
            branches.append(new_branch)
            print(f"Created branch: {new_branch.location} (ID: {new_branch.id})")
        else:
            branches.append(existing_branch)
            print(f"Branch already exists: {existing_branch.location} (ID: {existing_branch.id})")

    print(f"\n✅ Total branches: {len(branches)}")
    print(f"Starting seed process for {len(books_data)} books...\n")

    for index, b in enumerate(books_data):
        # 1. Save to SQLite Relational Database
        new_book = models.Book(
            title=b["title"],
            author=b["author"],
            category=b["category"],
            description=b["description"]
        )
        db.add(new_book)
        db.commit()
        db.refresh(new_book)

        # 2. Save to ChromaDB Vector Database
        indexing_text = f"{new_book.title}: {new_book.description}"
        add_book_to_vector_db(
            book_id=new_book.id,
            text=indexing_text,
            metadata={"author": new_book.author, "category": new_book.category}
        )
        
        # 3. Create inventory records for each branch
        for branch in branches:
            # Check if inventory already exists
            existing_inventory = db.query(models.Inventory).filter(
                models.Inventory.book_id == new_book.id,
                models.Inventory.branch_id == branch.id
            ).first()
            
            if not existing_inventory:
                # Vary the number of copies per branch for variety
                # North Delhi: 3 copies, South Delhi: 10 copies
                copies = 3 if branch.location == "North Delhi" else 10
                
                inventory = models.Inventory(
                    book_id=new_book.id,
                    branch_id=branch.id,
                    total_copies=copies,
                    available_copies=copies
                )
                db.add(inventory)
        
        db.commit()
        
        # Print progress
        if (index + 1) % 10 == 0:
            print(f"Seeded {index + 1} / {len(books_data)} books with inventory...")

    db.close()
    print(f"✅ Database successfully seeded with {len(books_data)} books!")
    print("✅ Inventory created for all books across all branches!")

if __name__ == "__main__":
    seed_database()