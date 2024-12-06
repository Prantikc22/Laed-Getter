from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import requests
from dotenv import load_dotenv
import json
from datetime import datetime
import math
import os
import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import time

load_dotenv()

app = Flask(__name__)
CORS(app)

# Create database directory if it doesn't exist
os.makedirs('data', exist_ok=True)

# Initialize SQLite database
def init_db():
    conn = sqlite3.connect('data/leads.db')
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS saved_leads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            list_name TEXT NOT NULL,
            business_name TEXT NOT NULL,
            address TEXT,
            phone TEXT,
            website TEXT,
            distance REAL,
            status TEXT,
            google_maps_url TEXT,
            scraped_emails TEXT,
            postal_code TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

init_db()

GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY')

def get_place_details(place_id):
    url = f"https://maps.googleapis.com/maps/api/place/details/json"
    params = {
        'place_id': place_id,
        'key': GOOGLE_MAPS_API_KEY,
        'fields': 'name,formatted_address,formatted_phone_number,website,opening_hours,url,business_status'
    }
    
    response = requests.get(url, params=params)
    if response.status_code == 200:
        result = response.json().get('result', {})
        return {
            'business_name': result.get('name'),
            'address': result.get('formatted_address'),
            'phone': result.get('formatted_phone_number'),
            'website': result.get('website'),
            'status': result.get('business_status'),
            'google_maps_url': result.get('url'),
            'opening_hours': result.get('opening_hours', {}).get('weekday_text', [])
        }
    return None

def get_location_coordinates(location):
    url = f"https://maps.googleapis.com/maps/api/geocode/json"
    params = {
        'address': location,
        'key': GOOGLE_MAPS_API_KEY
    }
    
    response = requests.get(url, params=params)
    if response.status_code == 200:
        results = response.json().get('results', [])
        if results:
            location = results[0]['geometry']['location']
            return location['lat'], location['lng']
    return None

def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371  # Earth's radius in kilometers

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)

    a = math.sin(delta_lat/2) * math.sin(delta_lat/2) + \
        math.cos(lat1_rad) * math.cos(lat2_rad) * \
        math.sin(delta_lon/2) * math.sin(delta_lon/2)
    
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    distance = R * c

    return distance

def scrape_emails_from_url(url):
    try:
        response = requests.get(url, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find all text content
        text = soup.get_text()
        
        # Regular expression for email addresses
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        emails = set(re.findall(email_pattern, text))
        
        # Also check for contact page links
        contact_links = []
        for link in soup.find_all('a', href=True):
            href = link.get('href')
            text = link.text.lower()
            if 'contact' in text or 'about' in text:
                contact_links.append(urljoin(url, href))
        
        # Scrape contact pages
        for contact_url in contact_links[:2]:  # Limit to first 2 contact pages
            try:
                contact_response = requests.get(contact_url, timeout=5)
                contact_soup = BeautifulSoup(contact_response.text, 'html.parser')
                contact_text = contact_soup.get_text()
                emails.update(re.findall(email_pattern, contact_text))
            except:
                continue
        
        return list(emails)
    except Exception as e:
        print(f"Error scraping emails: {str(e)}")
        return []

@app.route('/api/search', methods=['GET', 'POST'])
def search_places():
    if request.method == 'GET':
        keyword = request.args.get('query', '')
        locations = json.loads(request.args.get('locations', '[]'))
        radius = int(request.args.get('radius', '50000'))  # Default to 50km for regular search
        exact_pincode = request.args.get('exactPincodeSearch', 'false').lower() == 'true'
        page_token = request.args.get('pageToken', None)
    else:
        data = request.json
        keyword = data.get('keyword', '')
        locations = data.get('locations', [])
        radius = data.get('radius', 50000)
        exact_pincode = data.get('exactPincodeSearch', False)
        page_token = data.get('pageToken', None)

    all_results = []
    next_page_token = None

    # For exact postal/zip code search, use a larger radius to get all results
    search_radius = 50000 if exact_pincode else radius  # 50km radius for postal code search to get all results

    for location in locations:
        try:
            coords = get_location_coordinates(location)
            if not coords:
                continue
            lat, lng = coords

            # Search parameters
            search_params = {
                'location': f"{lat},{lng}",
                'radius': search_radius,
                'keyword': keyword,
                'type': 'establishment',
                'key': GOOGLE_MAPS_API_KEY
            }

            if page_token:
                search_params['pagetoken'] = page_token

            # Perform the search
            url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
            response = requests.get(url, params=search_params)
            
            if response.status_code != 200:
                continue
                
            places_result = response.json()
            next_page_token = places_result.get('next_page_token')
            
            for place in places_result.get('results', []):
                # Get place details for website and phone
                place_details = get_place_details(place['place_id'])
                if not place_details:
                    continue

                # Extract postal/zip code from address using regex
                postal_code = None
                address = place_details['address']
                
                # Match common postal/zip code formats worldwide
                # US: 5 digits or 5+4
                # UK: Various formats
                # India: 6 digits
                # Canada: Letter+Number+Letter Number+Letter+Number
                # And others
                postal_patterns = [
                    r'\b\d{6}\b',  # India
                    r'\b\d{5}(?:-\d{4})?\b',  # US
                    r'\b[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}\b',  # UK
                    r'\b[ABCEGHJ-NPRSTVXY]\d[A-Z] ?\d[A-Z]\d\b',  # Canada
                    r'\b\d{4} ?[A-Z]{2}\b',  # Netherlands
                    r'\b\d{4}\b',  # Many countries
                ]
                
                for pattern in postal_patterns:
                    match = re.search(pattern, address, re.IGNORECASE)
                    if match:
                        postal_code = match.group().strip()
                        break

                # Calculate distance
                place_lat = place['geometry']['location']['lat']
                place_lng = place['geometry']['location']['lng']
                distance = calculate_distance(lat, lng, place_lat, place_lng)

                result = {
                    'business_name': place_details['business_name'],
                    'address': address,
                    'postal_code': postal_code,
                    'phone': place_details['phone'],
                    'website': place_details['website'],
                    'distance': round(distance, 2),
                    'status': place_details['status'],
                    'google_maps_url': place_details['google_maps_url'],
                    'opening_hours': place_details['opening_hours']
                }

                # For exact postal code search, only include if codes match
                if exact_pincode:
                    search_code = location.strip().upper()
                    if postal_code and postal_code.strip().upper() == search_code:
                        all_results.append(result)
                else:
                    all_results.append(result)

        except Exception as e:
            print(f"Error processing location {location}: {str(e)}")
            continue

    # Remove duplicates based on business name and address
    seen = set()
    unique_results = []
    for result in all_results:
        key = (result['business_name'], result['address'])
        if key not in seen:
            seen.add(key)
            unique_results.append(result)

    # Sort results by distance
    unique_results.sort(key=lambda x: x['distance'])
    
    return jsonify({
        'results': unique_results,
        'next_page_token': next_page_token
    })

@app.route('/api/lists', methods=['GET'])
def get_lists():
    try:
        conn = sqlite3.connect('data/leads.db')
        c = conn.cursor()
        
        # Get distinct list names and count of businesses in each list
        c.execute('''
            SELECT list_name, COUNT(*) as count, MIN(id) as id
            FROM saved_leads 
            GROUP BY list_name
        ''')
        
        lists = [{'id': str(row[2]), 'name': row[0], 'count': row[1]} for row in c.fetchall()]
        conn.close()
        
        return jsonify(lists)
    except Exception as e:
        print(f"Error getting lists: {str(e)}")
        return jsonify({'error': 'Failed to get lists'}), 500

@app.route('/api/saved-lists', methods=['GET'])
def get_saved_lists():
    try:
        conn = sqlite3.connect('data/leads.db')
        c = conn.cursor()
        
        c.execute('''
            SELECT DISTINCT list_name, COUNT(*) as count,
            MAX(created_at) as last_updated
            FROM saved_leads
            GROUP BY list_name
            ORDER BY last_updated DESC
        ''')
        
        lists = [{'name': row[0], 'count': row[1], 'last_updated': row[2]} 
                for row in c.fetchall()]
        
        conn.close()
        return jsonify({'success': True, 'lists': lists})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/saved-lists/<list_name>', methods=['GET'])
def get_list_businesses(list_name):
    try:
        conn = sqlite3.connect('data/leads.db')
        c = conn.cursor()
        
        c.execute('''
            SELECT 
                id,
                business_name,
                address,
                phone,
                website,
                distance,
                status,
                google_maps_url,
                scraped_emails,
                created_at,
                postal_code
            FROM saved_leads 
            WHERE list_name = ?
            ORDER BY created_at DESC
        ''', (list_name,))
        
        businesses = []
        for row in c.fetchall():
            businesses.append({
                'id': row[0],
                'business_name': row[1],
                'address': row[2],
                'phone': row[3],
                'website': row[4],
                'distance': row[5],
                'status': row[6],
                'google_maps_url': row[7],
                'scraped_emails': json.loads(row[8]) if row[8] else [],
                'created_at': row[9],
                'postal_code': row[10]
            })
        
        conn.close()
        return jsonify(businesses)
        
    except Exception as e:
        print(f"Error in get_list_businesses: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/save-business', methods=['POST'])
def save_business():
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        list_name = data.get('list_name')
        if not list_name:
            return jsonify({'error': 'List name is required'}), 400

        conn = sqlite3.connect('data/leads.db')
        c = conn.cursor()
        
        # Handle both single business and multiple businesses
        businesses = []
        if data.get('business'):
            businesses = [data['business']]
        elif data.get('businesses'):
            businesses = data['businesses']
        
        if not businesses:
            return jsonify({'error': 'No businesses to save'}), 400

        # Prepare all businesses for insertion
        values = []
        for business in businesses:
            values.append((
                list_name,
                business.get('business_name', ''),
                business.get('address', ''),
                business.get('phone', ''),
                business.get('website', ''),
                business.get('distance', 0),
                business.get('status', ''),
                business.get('google_maps_url', ''),
                json.dumps(business.get('scraped_emails', [])),
                business.get('postal_code', '')
            ))

        # Insert all businesses in a single transaction
        c.executemany('''
            INSERT INTO saved_leads (
                list_name, business_name, address, phone, website,
                distance, status, google_maps_url, scraped_emails, postal_code
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', values)
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': f'Successfully saved {len(businesses)} business(es)'})
    except Exception as e:
        print(f"Error saving business: {str(e)}")
        if 'conn' in locals():
            conn.close()
        return jsonify({'error': f'Failed to save business: {str(e)}'}), 500

@app.route('/api/scrape-email', methods=['POST'])
def scrape_email():
    try:
        data = request.json
        website = data.get('website')
        if not website:
            return jsonify({'error': 'Website URL is required'}), 400
            
        # Add http:// if not present
        if not website.startswith(('http://', 'https://')):
            website = 'https://' + website
            
        emails = scrape_emails_from_url(website)
        return jsonify({
            'success': True,
            'emails': emails
        })
    except Exception as e:
        print(f"Error in scrape_email: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/delete-business/<int:business_id>', methods=['DELETE'])
def delete_business(business_id):
    try:
        conn = sqlite3.connect('data/leads.db')
        c = conn.cursor()
        
        # Delete the business
        c.execute('DELETE FROM saved_leads WHERE id = ?', (business_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Business deleted successfully'})
        
    except Exception as e:
        print(f"Error in delete_business: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=3001, debug=True)
