import { Controller } from '@nestjs/common';
import { RoadService } from './services/road/road.service';

@Controller('api/road')
export class RoadController {
    constructor(private roadService: RoadService){}
}
