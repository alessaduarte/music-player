import React, { useState, useEffect } from 'react';
import './App.css';
import albumPlaceholder from './Assets/AlbumPlaceholder.png';
import searchMusicIcon from './Assets/SearchMusicIcon.svg';

// Read credentials from environment variables (Create React App expects REACT_APP_ prefix)
const CLIENT_ID = process.env.REACT_APP_SPOTIFY_CLIENT_ID || '';
const CLIENT_SECRET = process.env.REACT_APP_SPOTIFY_CLIENT_SECRET || '';

const defaultCover = albumPlaceholder;
const searchIcon = searchMusicIcon;

export default function Main() {
	const [query, setQuery] = useState('');
	const [accessToken, setAccessToken] = useState('');
	const [tokenExpiry, setTokenExpiry] = useState(0);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	// Track info to display on the card
	const [trackTitle, setTrackTitle] = useState('California');
	const [trackImage, setTrackImage] = useState(defaultCover);

	useEffect(() => {
		// If client credentials are not provided, do nothing (we'll show a helpful message)
		if (!CLIENT_ID || !CLIENT_SECRET) return;

		// Fetch an app-level token (Client Credentials flow). Token is cached until expiry.
		async function fetchToken() {
			try {
				const creds = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
				const res = await fetch('https://accounts.spotify.com/api/token', {
					method: 'POST',
					headers: {
						Authorization: `Basic ${creds}`,
						'Content-Type': 'application/x-www-form-urlencoded',
					},
					body: 'grant_type=client_credentials',
				});

				if (!res.ok) {
					const body = await res.text();
					throw new Error(`Token request failed: ${res.status} ${body}`);
				}

				const data = await res.json();
				setAccessToken(data.access_token);
				// expires_in is in seconds
				setTokenExpiry(Date.now() + (data.expires_in || 3600) * 1000);
			} catch (err) {
				console.error(err);
				setError('Failed to obtain Spotify token. Check your CLIENT_ID/CLIENT_SECRET in .env');
			}
		}

		fetchToken();
	}, []);

	async function handleSubmit(e) {
		e.preventDefault();
		setError('');
		if (!query.trim()) return;

		// Ensure we have a token and it's not expired
		if (!accessToken || Date.now() >= tokenExpiry) {
			setError('Spotify token missing or expired. Restart the dev server after adding credentials to .env');
			return;
		}

		setLoading(true);
		try {
			const q = encodeURIComponent(query);
			const url = `https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`;
			const res = await fetch(url, {
				headers: { Authorization: `Bearer ${accessToken}` },
			});

			if (!res.ok) {
				if (res.status === 401) {
					setError('Spotify token invalid or expired. Restart the dev server after updating .env');
				} else {
					const body = await res.text();
					setError(`Spotify API error: ${res.status} ${body}`);
				}
				setLoading(false);
				return;
			}

			const data = await res.json();
			const item = data.tracks && data.tracks.items && data.tracks.items[0];
			if (!item) {
				setError('No track found for that query.');
				setLoading(false);
				return;
			}

			const title = `${item.name} — ${item.artists.map((a) => a.name).join(', ')}`;
			const image = (item.album && item.album.images && item.album.images[0] && item.album.images[0].url) || defaultCover;

			setTrackTitle(title);
			setTrackImage(image);
		} catch (err) {
			console.error(err);
			setError('Failed to search Spotify');
		} finally {
			setLoading(false);
		}
	}

		return (
			<div className="app-root">
				<header className="app-header" aria-hidden="false">
				<h1 className="app-title">MUSIC PLAYER</h1>

				<form className="search-box" role="search" aria-label="Search" onSubmit={handleSubmit}>
					<img className="search-icon" src={searchIcon} alt="search icon" aria-hidden="true" />
					<input
						className="search-input"
						type="search"
						name="q"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search for an artist, song or playlist"
						aria-label="Search for an artist, song or playlist"
					/>
				</form>

				<div style={{ marginTop: 8 }}>
					<small style={{ color: '#333' }}>
						{loading ? 'Searching Spotify…' : error ? `Error: ${error}` : !CLIENT_ID || !CLIENT_SECRET ? 'Missing CLIENT_ID/CLIENT_SECRET in .env (see README)' : 'Ready to search'}
					</small>
				</div>
			</header>

			<div className="main-container">
				<div className="music-card" role="group" aria-label="Music Card">
					<div className="cover-wrap">
						<img className="cover" src={trackImage} alt="cover" />
					</div>

					<div className="title">{trackTitle}</div>

					<div className="progress-wrap">
						<div className="progress-track">
							<div className="progress-thumb" />
						</div>
					</div>

					<button className="play-button" aria-label="play">
						<span className="play-triangle" />
					</button>
				</div>
					</div>
				</div>
    
	);
}
