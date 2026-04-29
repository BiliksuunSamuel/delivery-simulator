import { Prop, Schema } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { BaseSchema } from '.';

@Schema({ collection: 'retailers' })
export class Retailer extends BaseSchema {
  @Prop({ required: true })
  @ApiProperty()
  name: string;

  @Prop({ default: '' })
  @ApiProperty()
  address: string;

  @Prop({ required: true })
  @ApiProperty()
  latitude: number;

  @Prop({ required: true })
  @ApiProperty()
  longitude: number;

  // Hubtel-style operational geography. The retailer's zone (catchment) +
  // station (rider hub) get copied onto every order it produces and stamped
  // onto every rider-performance record so dispatch can later filter or
  // route by them.
  @Prop({ type: String, default: null })
  @ApiProperty()
  zone: string | null;

  @Prop({ type: String, default: null })
  @ApiProperty()
  station: string | null;
}
