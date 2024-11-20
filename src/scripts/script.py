import os
import requests
from dotenv import load_dotenv
import requests
from pymongo import MongoClient
from bs4 import BeautifulSoup

dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env')

url = "https://www.sjsu.edu/classes/schedules/fall-2024.php"
soup = None

load_dotenv()

def connectToMongo():
    mongo_uri = os.getenv("MONGO_URI")
    print(mongo_uri)
    try:
        client = MongoClient(mongo_uri, tlsInsecure =True)
        print(client)
        db = client['study-sync']
        print(db)
        return client,db 
    except ConnectionError as e:
        print("Error connecting to mongodb")
        return None, None
    
def initializeSoup(url):
    #Find HTML page
    try:
        page = requests.get(url).text
        soup = BeautifulSoup(page,'lxml')
        return soup
    except Exception as e:
        print(e)
        return None

def scrapeTableStructure():
    try:
        #Search for specific HTML elements
        courseStructure = soup.find('tr')
        collectionStructure = []

        #Structure is defined as
        #[Section, Class Number, Mode of Instruction, Course Title, Satisfies, Units, Type, Days, Times, Instructor, Location, Dates, Open Seats, Notes]
        for tableCol in courseStructure:
            #Text will be directly correlated to our collection structure
            if tableCol.text != '\n':
                #Ignore new line
                collectionStructure.append(tableCol.text)

        return collectionStructure
    except Exception as e:
        print(e)
        return None
    
def scrapeClasses():
    try:
        #Find table rows that have odd and even
        classes = soup.find_all('tr')
        print(f"Total rows found: {len(classes)}")
        class_data = []
        #Skip first row
        for class_entry in classes[1:]:
            #Identify and add into dictionary
            td = class_entry.find_all('td')
            if td:
                section = td[0].text.strip()
                class_number = td[1].text.strip()
                mode_of_instruction = td[2].text.strip()
                course_title = td[3].text.strip()
                satisfies = td[4].text.strip()
                units = td[5].text.strip()
                class_type = td[6].text.strip()
                days = td[7].text.strip()
                times = td[8].text.strip()
                instructor = td[9].text.strip()
                location = td[10].text.strip()
                dates = td[11].text.strip()

                #Add the data into the dictionary
                class_data.append(
                    {
                        'section': section,
                        'class_number':class_number,
                        'mode_of_instruction': mode_of_instruction,
                        'course_title': course_title,
                        'satisfies': satisfies,
                        'units': units,
                        'class_type': class_type,
                        'days': days,
                        'times': times,
                        'instructor': instructor,
                        'location' : location,
                        'dates': dates,
                    }
                )
                print(f'Saved: {class_data[-1]}')

        #Return the dictionary
        return class_data
        
    except Exception as e:
        return None

def saveToMongo(db, class_data):
    if db is not None and class_data:
        try:
            collection = db['scrappedcourses']
            print(collection)
            for class_entry in class_data:
                print(class_entry)
                existing_entry = collection.find_one({'class_number': class_entry['class_number']})
                #If entry exists
                if existing_entry:
                    #Validate and update the entry
                    if existing_entry != class_entry:
                        collection.update_one({'class_number': class_entry['class_number']},{'$set':class_entry})
                    print("Found entry")
                    continue
                else:
                    print("Inserting")
                    collection.insert_one(class_entry)
            print("data saved to db")
        except Exception as e:
            print(f'Error saving {e}')
    
if __name__ == "__main__":
    soup = initializeSoup(url)
    if soup:
        scrapeTableStructure()
        class_data = scrapeClasses()
        client, db = connectToMongo()
        if db is not None:
            saveToMongo(db, class_data)
        if client:
            client.close()


    
