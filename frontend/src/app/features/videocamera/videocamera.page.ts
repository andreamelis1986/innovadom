import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-videocamera',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './videocamera.page.html',
  styleUrls: ['./videocamera.page.css'],
})
export class VideocameraPage implements OnInit {

  cameras = [
    { id: 1, name: 'Ingresso Principale', streamUrl: 'assets/video_sample.mp4', online: true },
    { id: 2, name: 'Soggiorno', streamUrl: 'assets/video_sample.mp4', online: true },
    { id: 3, name: 'Giardino', streamUrl: '', online: false },
    { id: 4, name: 'Garage', streamUrl: 'assets/video_sample.mp4', online: true },
  ];

  ngOnInit(): void {}
}
