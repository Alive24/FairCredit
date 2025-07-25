import { PublicKey } from "@solana/web3.js";

export interface HubAccount {
  authority: PublicKey | null;
  acceptedProviders: PublicKey[];
  acceptedEndorsers: PublicKey[];
  acceptedCourses: string[];
}

/**
 * Decode hub account data from the blockchain
 * Based on the Rust struct layout
 */
export function decodeHubAccount(data: Buffer): HubAccount {
  try {
    let offset = 8; // Skip discriminator (8 bytes)
    
    // Read authority (32 bytes)
    const authority = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    
    // Read accepted_providers vector
    const providersLen = data.readUInt32LE(offset);
    offset += 4;
    const acceptedProviders: PublicKey[] = [];
    for (let i = 0; i < providersLen && i < 100; i++) { // Max 100 providers
      acceptedProviders.push(new PublicKey(data.slice(offset, offset + 32)));
      offset += 32;
    }
    
    // Read accepted_endorsers vector
    const endorsersLen = data.readUInt32LE(offset);
    offset += 4;
    const acceptedEndorsers: PublicKey[] = [];
    for (let i = 0; i < endorsersLen && i < 100; i++) { // Max 100 endorsers
      acceptedEndorsers.push(new PublicKey(data.slice(offset, offset + 32)));
      offset += 32;
    }
    
    // Read accepted_courses vector (string IDs)
    const coursesLen = data.readUInt32LE(offset);
    offset += 4;
    const acceptedCourses: string[] = [];
    for (let i = 0; i < coursesLen && i < 50; i++) { // Max 50 courses
      // Each course ID is stored as a 32-byte array
      const courseIdBytes = data.slice(offset, offset + 32);
      // Find null terminator
      let courseIdLen = 32;
      for (let j = 0; j < 32; j++) {
        if (courseIdBytes[j] === 0) {
          courseIdLen = j;
          break;
        }
      }
      const courseId = courseIdBytes.slice(0, courseIdLen).toString('utf8').trim();
      if (courseId) {
        acceptedCourses.push(courseId);
      }
      offset += 32;
    }
    
    return {
      authority,
      acceptedProviders,
      acceptedEndorsers,
      acceptedCourses,
    };
  } catch (error) {
    console.error("Error decoding hub account:", error);
    // Return a default structure if decoding fails
    return {
      authority: null,
      acceptedProviders: [],
      acceptedEndorsers: [],
      acceptedCourses: [],
    };
  }
}